"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  audioLayerApprovalSchema,
  audioLayerSchema,
  soundAssetUploadSchema,
} from "@/domain/audio-layer";
import { assetApprovalSchema } from "@/domain/scene-image";
import { requireWorkspace } from "@/server/workspace";

const bucket = "k-lore-assets";
const maxAudioBytes = 25 * 1024 * 1024;
const location = (ideaId: string, key: "saved" | "error", message: string) =>
  `/stories/${ideaId}/audio?${key}=${encodeURIComponent(message)}`;

function audioFormat(file: File, bytes: Uint8Array) {
  const mp3 =
    file.type === "audio/mpeg" &&
    (String.fromCharCode(...bytes.slice(0, 3)) === "ID3" ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  const wav =
    file.type === "audio/wav" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WAVE";
  if (mp3) return { extension: "mp3", mimeType: "audio/mpeg" };
  if (wav) return { extension: "wav", mimeType: "audio/wav" };
  return null;
}

export async function uploadSoundAssetAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId") ?? "");
  const parsed = soundAssetUploadSchema.safeParse({
    title: formData.get("title"),
    rights: formData.get("rights"),
    sourceUrl: formData.get("sourceUrl"),
    attribution: formData.get("attribution"),
  });
  const file = formData.get("soundFile");
  if (!parsed.success || !(file instanceof File) || !ideaId)
    redirect(location(ideaId, "error", "음원과 권리 정보를 확인해 주세요."));
  if (file.size <= 0 || file.size > maxAudioBytes)
    redirect(
      location(ideaId, "error", "MP3 또는 WAV 파일을 25MB 이하로 올려 주세요."),
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = audioFormat(file, bytes);
  if (!format)
    redirect(
      location(
        ideaId,
        "error",
        "파일 내용과 MP3/WAV 형식이 일치하지 않습니다.",
      ),
    );
  const { supabase, workspaceId } = await requireWorkspace();
  const assetId = randomUUID();
  const storagePath = `${workspaceId}/sound-library/${assetId}.${format.extension}`;
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      cacheControl: "31536000",
      contentType: format.mimeType,
      upsert: false,
    });
  if (uploadError)
    redirect(location(ideaId, "error", "음원 업로드에 실패했습니다."));
  const { error } = await supabase.from("assets").insert({
    id: assetId,
    workspace_id: workspaceId,
    kind: "audio",
    storage_bucket: bucket,
    storage_path: storagePath,
    mime_type: format.mimeType,
    bytes: file.size,
    checksum_sha256: checksum,
    metadata: {
      purpose: "sound_library",
      title: parsed.data.title,
      rights: parsed.data.rights,
      sourceUrl: parsed.data.sourceUrl || null,
      attribution: parsed.data.attribution || null,
      originalName: file.name,
    },
  });
  if (error) {
    await supabase.storage.from(bucket).remove([storagePath]);
    redirect(location(ideaId, "error", "Sound Library 등록에 실패했습니다."));
  }
  revalidatePath(`/stories/${ideaId}/audio`);
  revalidatePath("/assets");
  redirect(
    location(ideaId, "saved", "음원을 등록했습니다. 검토 후 승인해 주세요."),
  );
}

export async function approveSoundAssetAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId") ?? "");
  const parsed = assetApprovalSchema.safeParse({
    assetId: formData.get("assetId"),
  });
  if (!parsed.success)
    redirect(location(ideaId, "error", "올바르지 않은 Sound Asset입니다."));
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("assets")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.assetId)
    .eq("kind", "audio")
    .eq("status", "draft")
    .contains("metadata", { purpose: "sound_library" })
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(location(ideaId, "error", "Sound Asset 승인에 실패했습니다."));
  revalidatePath(`/stories/${ideaId}/audio`);
  revalidatePath("/assets");
  redirect(location(ideaId, "saved", "Sound Asset을 승인하고 잠갔습니다."));
}

export async function createAudioLayerAction(formData: FormData) {
  const parsed = audioLayerSchema.safeParse({
    ideaId: formData.get("ideaId"),
    assetId: formData.get("assetId"),
    sceneId: formData.get("sceneId"),
    layerType: formData.get("layerType"),
    label: formData.get("label"),
    startSeconds: formData.get("startSeconds"),
    endSeconds: formData.get("endSeconds"),
    volumeDb: formData.get("volumeDb"),
    fadeInSeconds: formData.get("fadeInSeconds"),
    fadeOutSeconds: formData.get("fadeOutSeconds"),
    loop: formData.get("loop") === "on",
    notes: formData.get("notes"),
  });
  if (!parsed.success)
    redirect(
      location(
        String(formData.get("ideaId") ?? ""),
        "error",
        "Audio Layer 시간과 볼륨을 확인해 주세요.",
      ),
    );
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("episode_id")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  const { data: asset } = await supabase
    .from("assets")
    .select("id, status, kind, metadata")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.assetId)
    .contains("metadata", { purpose: "sound_library" })
    .maybeSingle();
  if (
    !idea?.episode_id ||
    !asset ||
    asset.kind !== "audio" ||
    asset.status !== "approved"
  )
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "승인된 Sound Asset만 Layer로 배치할 수 있습니다.",
      ),
    );
  if (parsed.data.sceneId) {
    const { data: scene } = await supabase
      .from("scenes")
      .select("id, scene_plan_versions!inner(episode_id)")
      .eq("workspace_id", workspaceId)
      .eq("id", parsed.data.sceneId)
      .maybeSingle();
    if (!scene || scene.scene_plan_versions.episode_id !== idea.episode_id)
      redirect(
        location(
          parsed.data.ideaId,
          "error",
          "이 에피소드의 장면을 선택해 주세요.",
        ),
      );
  }
  const { error } = await supabase.from("audio_layers").insert({
    workspace_id: workspaceId,
    episode_id: idea.episode_id,
    scene_id: parsed.data.sceneId || null,
    asset_id: asset.id,
    layer_type: parsed.data.layerType,
    label: parsed.data.label,
    start_ms: Math.round(parsed.data.startSeconds * 1000),
    end_ms:
      parsed.data.endSeconds === ""
        ? null
        : Math.round(parsed.data.endSeconds * 1000),
    volume_db: parsed.data.volumeDb,
    fade_in_ms: Math.round(parsed.data.fadeInSeconds * 1000),
    fade_out_ms: Math.round(parsed.data.fadeOutSeconds * 1000),
    loop: parsed.data.loop,
    notes: parsed.data.notes || null,
  });
  if (error)
    redirect(
      location(parsed.data.ideaId, "error", "Audio Layer 저장에 실패했습니다."),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/audio`);
  redirect(
    location(
      parsed.data.ideaId,
      "saved",
      "Audio Layer를 Timeline에 추가했습니다.",
    ),
  );
}

export async function approveAudioLayerAction(formData: FormData) {
  const parsed = audioLayerApprovalSchema.safeParse({
    ideaId: formData.get("ideaId"),
    layerId: formData.get("layerId"),
  });
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+Audio+Layer입니다.");
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("audio_layers")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.layerId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(
      location(parsed.data.ideaId, "error", "Audio Layer 승인에 실패했습니다."),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/audio`);
  redirect(
    location(parsed.data.ideaId, "saved", "Audio Layer를 승인하고 잠갔습니다."),
  );
}
