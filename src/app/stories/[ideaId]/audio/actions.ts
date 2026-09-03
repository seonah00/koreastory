"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  composeVoiceInstructions,
  narrationAudioRequestSchema,
  parseHalmeoniVoice,
} from "@/domain/narration-audio";
import { assetApprovalSchema } from "@/domain/scene-image";
import { runOpenAISpeech } from "@/server/ai/openai-speech";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

const bucket = "k-lore-assets";
const location = (ideaId: string, key: "saved" | "error", message: string) =>
  `/stories/${ideaId}/audio?${key}=${encodeURIComponent(message)}`;

export async function generateNarrationAudioAction(formData: FormData) {
  const parsed = narrationAudioRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
    scriptSegmentId: formData.get("scriptSegmentId"),
  });
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+대본+구간입니다.");
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "OPENAI_API_KEY 설정이 필요합니다.",
      ),
    );
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("episode_id")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id)
    redirect(
      location(parsed.data.ideaId, "error", "에피소드를 찾지 못했습니다."),
    );
  const { data: segment } = await supabase
    .from("script_segments")
    .select(
      "id, position, narration, emotion, script_versions!inner(episode_id, status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.scriptSegmentId)
    .maybeSingle();
  if (
    !segment ||
    segment.script_versions.episode_id !== idea.episode_id ||
    segment.script_versions.status !== "approved"
  )
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "승인된 대본 구간만 음성으로 만들 수 있습니다.",
      ),
    );
  if (segment.narration.length > 4096)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "이 구간은 4,096자를 초과합니다. 대본을 더 작은 구간으로 나눠 주세요.",
      ),
    );

  const { data: voiceEntry } = await supabase
    .from("bible_entries")
    .select("id, version, content")
    .eq("workspace_id", workspaceId)
    .eq("kind", "voice")
    .eq("slug", "halmeoni-voice")
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!voiceEntry)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "승인된 Halmeoni Voice Bible이 필요합니다.",
      ),
    );
  const voice = parseHalmeoniVoice(voiceEntry.content);
  const instructions = composeVoiceInstructions(voice, segment.emotion);
  const request = {
    scriptSegmentId: segment.id,
    position: segment.position,
    input: segment.narration,
    voiceBibleEntryId: voiceEntry.id,
    voiceBibleVersion: voiceEntry.version,
    voice: voice.providerVoice,
    speed: voice.speakingRate,
    instructions,
    responseFormat: "mp3",
  };
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      episode_id: idea.episode_id,
      provider: "openai",
      model: env.OPENAI_TTS_MODEL,
      kind: "narration_audio",
      status: "pending",
      request: request as Json,
    })
    .select("id")
    .single();
  if (generationError)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "음성 생성 기록을 만들지 못했습니다.",
      ),
    );
  await supabase
    .from("generations")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", generation.id);
  let storagePath: string | null = null;
  let assetCreated = false;
  try {
    const result = await runOpenAISpeech({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_TTS_MODEL,
      input: segment.narration,
      voice: voice.providerVoice,
      instructions,
      speed: voice.speakingRate,
    });
    const checksum = createHash("sha256").update(result.bytes).digest("hex");
    storagePath = `${workspaceId}/episodes/${idea.episode_id}/audio/${segment.id}/${generation.id}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, result.bytes, {
        cacheControl: "31536000",
        contentType: "audio/mpeg",
        upsert: false,
      });
    if (uploadError) throw uploadError;
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        workspace_id: workspaceId,
        episode_id: idea.episode_id,
        script_segment_id: segment.id,
        generation_id: generation.id,
        kind: "audio",
        storage_bucket: bucket,
        storage_path: storagePath,
        mime_type: "audio/mpeg",
        bytes: result.bytes.byteLength,
        checksum_sha256: checksum,
        metadata: {
          purpose: "narration",
          segmentPosition: segment.position,
          voice: voice.providerVoice,
          voiceBibleEntryId: voiceEntry.id,
          voiceBibleVersion: voiceEntry.version,
        },
      })
      .select("id")
      .single();
    if (assetError) throw assetError;
    assetCreated = true;
    const { error: finishError } = await supabase
      .from("generations")
      .update({
        status: "succeeded",
        response: {
          assetId: asset.id,
          storagePath,
          bytes: result.bytes.byteLength,
          checksumSha256: checksum,
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    if (finishError) throw finishError;
  } catch (error) {
    if (storagePath && !assetCreated)
      await supabase.storage.from(bucket).remove([storagePath]);
    await supabase
      .from("generations")
      .update({
        status: "failed",
        error: {
          message:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Unknown TTS error",
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "음성 생성에 실패했습니다. 실행 기록에 원인이 보존되었습니다.",
      ),
    );
  }
  revalidatePath(`/stories/${parsed.data.ideaId}/audio`);
  revalidatePath("/assets");
  redirect(
    location(
      parsed.data.ideaId,
      "saved",
      `Narration ${segment.position + 1} 음성을 저장했습니다.`,
    ),
  );
}

export async function approveNarrationAudioAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId") ?? "");
  const parsed = assetApprovalSchema.safeParse({
    assetId: formData.get("assetId"),
  });
  if (!parsed.success)
    redirect(location(ideaId, "error", "올바르지 않은 Audio Asset입니다."));
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("assets")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.assetId)
    .eq("kind", "audio")
    .eq("status", "draft")
    .contains("metadata", { purpose: "narration" })
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(location(ideaId, "error", "Narration 승인에 실패했습니다."));
  revalidatePath(`/stories/${ideaId}/audio`);
  revalidatePath("/assets");
  redirect(location(ideaId, "saved", "Narration Audio를 승인하고 잠갔습니다."));
}
