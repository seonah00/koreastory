"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  composeSceneImagePrompt,
  sceneImageCostUsd,
  sceneImageRequestSchema,
} from "@/domain/scene-image";
import { runOpenAIImage } from "@/server/ai/openai-image";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

const bucket = "k-lore-assets";

function location(ideaId: string, key: "saved" | "error", message: string) {
  return `/stories/${ideaId}/scenes?${key}=${encodeURIComponent(message)}`;
}

function asObject(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export async function generateSceneImageAction(formData: FormData) {
  const parsed = sceneImageRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
    sceneId: formData.get("sceneId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+장면입니다.");

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
    .select("episode_id, category_presets(visual_rules)")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id)
    redirect(
      location(parsed.data.ideaId, "error", "에피소드를 찾지 못했습니다."),
    );

  const { data: scene } = await supabase
    .from("scenes")
    .select(
      "id, scene_plan_version_id, position, title, description, visual_prompt, negative_prompt",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.sceneId)
    .maybeSingle();
  if (!scene)
    redirect(location(parsed.data.ideaId, "error", "장면을 찾지 못했습니다."));

  const [{ data: plan }, { data: entries }] = await Promise.all([
    supabase
      .from("scene_plan_versions")
      .select("id, episode_id, status")
      .eq("workspace_id", workspaceId)
      .eq("id", scene.scene_plan_version_id)
      .maybeSingle(),
    supabase
      .from("bible_entries")
      .select("kind, slug, version, content")
      .eq("workspace_id", workspaceId)
      .eq("status", "approved")
      .order("version", { ascending: false }),
  ]);
  if (
    !plan ||
    plan.episode_id !== idea.episode_id ||
    plan.status !== "approved"
  ) {
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "이미지 생성 전에 현재 Scene Plan을 승인해 주세요.",
      ),
    );
  }
  const { data: lastScene } = await supabase
    .from("scenes")
    .select("position")
    .eq("workspace_id", workspaceId)
    .eq("scene_plan_version_id", plan.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const approved = new Map<string, Json>();
  for (const entry of entries ?? []) {
    const key = `${entry.kind}:${entry.slug}`;
    if (!approved.has(key)) approved.set(key, entry.content);
  }
  const bible = {
    master: asObject(approved.get("brand:k-lore-master-style") ?? {}),
    halmeoni: asObject(approved.get("character:halmeoni") ?? {}),
    house: asObject(approved.get("world:halmeoni-house") ?? {}),
  };
  const categoryRules = asObject(idea.category_presets?.visual_rules ?? {});
  const prompt = composeSceneImagePrompt({
    bible,
    categoryRules,
    isFramingScene:
      scene.position === 0 || scene.position === lastScene?.position,
    scene: {
      description: scene.description,
      negativePrompt: scene.negative_prompt,
      position: scene.position,
      title: scene.title,
      visualPrompt: scene.visual_prompt,
    },
  });
  const request = {
    sceneId: scene.id,
    scenePlanVersionId: plan.id,
    prompt,
    bible,
    categoryRules,
    output: { size: "1536x1024", quality: "medium", format: "webp" },
  };
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      episode_id: idea.episode_id,
      provider: "openai",
      model: env.OPENAI_IMAGE_MODEL,
      kind: "scene_image",
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
        "이미지 생성 기록을 만들지 못했습니다.",
      ),
    );

  await supabase
    .from("generations")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", generation.id);
  let storagePath: string | null = null;
  let assetCreated = false;
  try {
    const result = await runOpenAIImage({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_IMAGE_MODEL,
      prompt,
    });
    const checksum = createHash("sha256").update(result.bytes).digest("hex");
    storagePath = `${workspaceId}/episodes/${idea.episode_id}/scenes/${scene.id}/${generation.id}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, result.bytes, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        workspace_id: workspaceId,
        episode_id: idea.episode_id,
        scene_id: scene.id,
        generation_id: generation.id,
        kind: "image",
        storage_bucket: bucket,
        storage_path: storagePath,
        mime_type: "image/webp",
        bytes: result.bytes.byteLength,
        checksum_sha256: checksum,
        metadata: {
          title: scene.title,
          scenePosition: scene.position,
          revisedPrompt: result.revisedPrompt ?? null,
          width: 1536,
          height: 1024,
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
          revisedPrompt: result.revisedPrompt ?? null,
          bytes: result.bytes.byteLength,
          checksumSha256: checksum,
        },
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens,
        cost_usd:
          env.OPENAI_IMAGE_MODEL === "gpt-image-2" ? sceneImageCostUsd : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    if (finishError) throw finishError;
  } catch (error) {
    if (storagePath && !assetCreated)
      await supabase.storage.from(bucket).remove([storagePath]);
    const message =
      error instanceof Error
        ? error.message.slice(0, 1000)
        : "Unknown image-generation error";
    await supabase
      .from("generations")
      .update({
        status: "failed",
        error: { message },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "이미지 생성에 실패했습니다. 실행 기록에 원인이 보존되었습니다.",
      ),
    );
  }

  revalidatePath(`/stories/${parsed.data.ideaId}/scenes`);
  revalidatePath("/assets");
  redirect(
    location(
      parsed.data.ideaId,
      "saved",
      `Scene ${scene.position + 1} 이미지를 Asset Library에 저장했습니다.`,
    ),
  );
}
