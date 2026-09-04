"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  publishPackageContentSchema,
  publishPackageRequestSchema,
  publishPackageVersionSchema,
  selectPublishTitleSchema,
} from "@/domain/publish-package";
import { renderManifestSchema } from "@/domain/render-manifest";
import { runOpenAIImage } from "@/server/ai/openai-image";
import { runOpenAIPublishPackage } from "@/server/ai/openai-publish-package";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

const bucket = "k-lore-assets";
const location = (ideaId: string, key: "saved" | "error", message: string) =>
  `/stories/${ideaId}/publish?${key}=${encodeURIComponent(message)}`;

export async function generatePublishPackageAction(formData: FormData) {
  const parsed = publishPackageRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+소재입니다.");
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
    .select(
      "id, title, synopsis, episode_id, category_presets(slug, title_rules)",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id)
    redirect(location(parsed.data.ideaId, "error", "에피소드가 없습니다."));

  const [{ data: episode }, { data: render }, { data: script }] =
    await Promise.all([
      supabase
        .from("episodes")
        .select("stage")
        .eq("workspace_id", workspaceId)
        .eq("id", idea.episode_id)
        .maybeSingle(),
      supabase
        .from("render_versions")
        .select("id, manifest, output_asset_id")
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .eq("status", "approved")
        .not("output_asset_id", "is", null)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("script_versions")
        .select("title")
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .eq("status", "approved")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  const manifest = renderManifestSchema.safeParse(render?.manifest);
  if (
    !episode ||
    !["ready", "published"].includes(episode.stage) ||
    !render?.output_asset_id ||
    !manifest.success
  ) {
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "Review를 완료한 Ready 영상이 필요합니다.",
      ),
    );
  }

  const request = {
    ideaId: idea.id,
    renderVersionId: render.id,
    categorySlug: idea.category_presets?.slug,
    sceneCount: manifest.data.scenes.length,
  };
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      episode_id: idea.episode_id,
      provider: "openai",
      model: env.OPENAI_PUBLISH_MODEL,
      kind: "youtube_publish_package",
      status: "running",
      request,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (generationError)
    redirect(
      location(idea.id, "error", "게시 패키지 생성 기록을 만들지 못했습니다."),
    );

  try {
    const result = await runOpenAIPublishPackage({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_PUBLISH_MODEL,
      scriptTitle: script?.title ?? idea.title,
      synopsis: idea.synopsis ?? "No synopsis provided.",
      categorySlug: idea.category_presets?.slug ?? "grandmas-tales",
      titleRules: idea.category_presets?.title_rules ?? {},
      scenes: manifest.data.scenes.map((scene) => ({
        startSeconds: Math.floor(
          scene.startFrame / manifest.data.composition.fps,
        ),
        title: scene.title,
        description: `Scene ${scene.position + 1}`,
      })),
    });
    const { data: version, error: versionError } = await supabase.rpc(
      "create_publish_package_version",
      {
        p_episode_id: idea.episode_id,
        p_render_version_id: render.id,
        p_generation_id: generation.id,
        p_content: result.content as unknown as Json,
      },
    );
    if (versionError || !version?.[0])
      throw versionError ?? new Error("Version save failed");
    await supabase
      .from("generations")
      .update({
        status: "succeeded",
        response: {
          responseId: result.responseId,
          publishPackageVersionId: version[0].publish_package_version_id,
          version: version[0].version,
        },
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
  } catch (error) {
    await supabase
      .from("generations")
      .update({
        status: "failed",
        error: {
          message:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Unknown error",
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(location(idea.id, "error", "게시 패키지 생성에 실패했습니다."));
  }
  revalidatePath(`/stories/${idea.id}/publish`);
  redirect(
    location(idea.id, "saved", "YouTube 게시 패키지 새 버전을 생성했습니다."),
  );
}

export async function selectPublishTitleAction(formData: FormData) {
  const parsed = selectPublishTitleSchema.safeParse({
    ideaId: formData.get("ideaId"),
    publishPackageVersionId: formData.get("publishPackageVersionId"),
    selectedTitle: formData.get("selectedTitle"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+제목입니다.");
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: row } = await supabase
    .from("publish_package_versions")
    .select("content")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.publishPackageVersionId)
    .eq("status", "draft")
    .maybeSingle();
  const content = publishPackageContentSchema.safeParse(row?.content);
  if (
    !content.success ||
    !content.data.titleOptions.includes(parsed.data.selectedTitle)
  )
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "생성된 후보 중에서 제목을 선택해 주세요.",
      ),
    );
  const { error } = await supabase
    .from("publish_package_versions")
    .update({
      content: { ...content.data, selectedTitle: parsed.data.selectedTitle },
    })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.publishPackageVersionId)
    .eq("status", "draft");
  if (error)
    redirect(
      location(parsed.data.ideaId, "error", "제목 저장에 실패했습니다."),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/publish`);
  redirect(location(parsed.data.ideaId, "saved", "대표 제목을 선택했습니다."));
}

export async function generateThumbnailAction(formData: FormData) {
  const parsed = publishPackageVersionSchema.safeParse({
    ideaId: formData.get("ideaId"),
    publishPackageVersionId: formData.get("publishPackageVersionId"),
  });
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+게시+패키지입니다.");
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
  const { data: pack } = await supabase
    .from("publish_package_versions")
    .select("id, episode_id, content")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.publishPackageVersionId)
    .eq("status", "draft")
    .maybeSingle();
  const content = publishPackageContentSchema.safeParse(pack?.content);
  if (!pack || !content.success)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "Draft 게시 패키지를 찾지 못했습니다.",
      ),
    );

  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      episode_id: pack.episode_id,
      provider: "openai",
      model: env.OPENAI_IMAGE_MODEL,
      kind: "youtube_thumbnail",
      status: "running",
      request: {
        publishPackageVersionId: pack.id,
        prompt: content.data.thumbnail.imagePrompt,
      },
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (generationError)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "썸네일 생성 기록을 만들지 못했습니다.",
      ),
    );

  let storagePath: string | null = null;
  let assetCreated = false;
  try {
    const result = await runOpenAIImage({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_IMAGE_MODEL,
      prompt: `${content.data.thumbnail.imagePrompt}\n\nDo not draw any letters. Reserve clean negative space for this separately overlaid headline: ${content.data.thumbnail.headline}`,
    });
    const checksum = createHash("sha256").update(result.bytes).digest("hex");
    storagePath = `${workspaceId}/episodes/${pack.episode_id}/publish/${pack.id}/${generation.id}.webp`;
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
        episode_id: pack.episode_id,
        generation_id: generation.id,
        kind: "image",
        storage_bucket: bucket,
        storage_path: storagePath,
        mime_type: "image/webp",
        bytes: result.bytes.byteLength,
        checksum_sha256: checksum,
        metadata: {
          purpose: "youtube_thumbnail",
          publishPackageVersionId: pack.id,
          headline: content.data.thumbnail.headline,
          revisedPrompt: result.revisedPrompt ?? null,
        },
      })
      .select("id")
      .single();
    if (assetError) throw assetError;
    assetCreated = true;
    const { error: attachError } = await supabase
      .from("publish_package_versions")
      .update({ thumbnail_asset_id: asset.id })
      .eq("workspace_id", workspaceId)
      .eq("id", pack.id)
      .eq("status", "draft");
    if (attachError) throw attachError;
    await supabase
      .from("generations")
      .update({
        status: "succeeded",
        response: { assetId: asset.id, storagePath, checksumSha256: checksum },
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
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
              : "Unknown error",
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(
      location(parsed.data.ideaId, "error", "썸네일 생성에 실패했습니다."),
    );
  }
  revalidatePath(`/stories/${parsed.data.ideaId}/publish`);
  redirect(
    location(parsed.data.ideaId, "saved", "썸네일 시안을 생성했습니다."),
  );
}

export async function approvePublishThumbnailAction(formData: FormData) {
  const parsed = publishPackageVersionSchema.safeParse({
    ideaId: formData.get("ideaId"),
    publishPackageVersionId: formData.get("publishPackageVersionId"),
  });
  const assetId = String(formData.get("assetId") ?? "");
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+게시+패키지입니다.");
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("assets")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", assetId)
    .eq("status", "draft")
    .contains("metadata", {
      purpose: "youtube_thumbnail",
      publishPackageVersionId: parsed.data.publishPackageVersionId,
    })
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(
      location(parsed.data.ideaId, "error", "썸네일 승인에 실패했습니다."),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/publish`);
  redirect(
    location(parsed.data.ideaId, "saved", "썸네일을 승인하고 잠갔습니다."),
  );
}

export async function approvePublishPackageAction(formData: FormData) {
  const parsed = publishPackageVersionSchema.safeParse({
    ideaId: formData.get("ideaId"),
    publishPackageVersionId: formData.get("publishPackageVersionId"),
  });
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+게시+패키지입니다.");
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("publish_package_versions")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.publishPackageVersionId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "제목과 썸네일 승인 상태를 확인해 주세요.",
      ),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/publish`);
  redirect(
    location(parsed.data.ideaId, "saved", "게시 패키지를 승인하고 잠갔습니다."),
  );
}
