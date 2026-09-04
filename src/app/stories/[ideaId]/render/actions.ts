"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  captionStyleForCategory,
  createCaptionCues,
  millisecondsToFrames,
  renderManifestSchema,
  renderVersionApprovalSchema,
  renderVersionRequestSchema,
  type RenderAsset,
} from "@/domain/render-manifest";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

const fps = 30;
const location = (ideaId: string, key: "saved" | "error", message: string) =>
  `/stories/${ideaId}/render?${key}=${encodeURIComponent(message)}`;

type AssetRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  checksum_sha256: string | null;
};

function manifestAsset(asset: AssetRow): RenderAsset {
  return {
    id: asset.id,
    bucket: asset.storage_bucket,
    path: asset.storage_path,
    mimeType: asset.mime_type ?? "application/octet-stream",
    checksumSha256: asset.checksum_sha256,
  };
}

function cameraMotion(value: string | null) {
  if (value === "static") return "static" as const;
  if (value?.includes("pan")) return "slow_pan" as const;
  return "slow_push_in" as const;
}

export async function createRenderVersionAction(formData: FormData) {
  const parsed = renderVersionRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+소재입니다.");

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("episode_id, category_presets(slug)")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id)
    redirect(location(parsed.data.ideaId, "error", "에피소드가 없습니다."));

  const { data: plan } = await supabase
    .from("scene_plan_versions")
    .select("id, script_version_id")
    .eq("workspace_id", workspaceId)
    .eq("episode_id", idea.episode_id)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan)
    redirect(
      location(parsed.data.ideaId, "error", "승인된 Scene Plan이 필요합니다."),
    );

  const { data: scenes } = await supabase
    .from("scenes")
    .select("id, position, title, duration_ms, camera_motion")
    .eq("workspace_id", workspaceId)
    .eq("scene_plan_version_id", plan.id)
    .order("position");
  if (!scenes?.length)
    redirect(location(parsed.data.ideaId, "error", "장면이 없습니다."));

  const sceneIds = scenes.map((scene) => scene.id);
  const [{ data: mappings }, { data: imageAssets }, { data: layers }] =
    await Promise.all([
      supabase
        .from("scene_segments")
        .select(
          "scene_id, position, script_segments(id, position, narration, estimated_duration_ms)",
        )
        .eq("workspace_id", workspaceId)
        .in("scene_id", sceneIds)
        .order("position"),
      supabase
        .from("assets")
        .select(
          "id, scene_id, storage_bucket, storage_path, mime_type, checksum_sha256, created_at",
        )
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .eq("kind", "image")
        .eq("status", "approved")
        .in("scene_id", sceneIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("audio_layers")
        .select(
          "id, layer_type, label, start_ms, end_ms, volume_db, fade_in_ms, fade_out_ms, loop, assets(id, storage_bucket, storage_path, mime_type, checksum_sha256)",
        )
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .eq("status", "approved")
        .order("start_ms"),
    ]);

  const segmentIds = [
    ...new Set((mappings ?? []).map((mapping) => mapping.script_segments.id)),
  ];
  const { data: narrationAssets } = segmentIds.length
    ? await supabase
        .from("assets")
        .select(
          "id, script_segment_id, storage_bucket, storage_path, mime_type, checksum_sha256, created_at",
        )
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .eq("kind", "audio")
        .eq("status", "approved")
        .contains("metadata", { purpose: "narration" })
        .in("script_segment_id", segmentIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const imageByScene = new Map<
    string,
    NonNullable<typeof imageAssets>[number]
  >();
  for (const asset of imageAssets ?? []) {
    if (asset.scene_id && !imageByScene.has(asset.scene_id))
      imageByScene.set(asset.scene_id, asset);
  }
  const narrationBySegment = new Map<
    string,
    NonNullable<typeof narrationAssets>[number]
  >();
  for (const asset of narrationAssets ?? []) {
    if (
      asset.script_segment_id &&
      !narrationBySegment.has(asset.script_segment_id)
    )
      narrationBySegment.set(asset.script_segment_id, asset);
  }
  const missingImage = scenes.some((scene) => !imageByScene.has(scene.id));
  const missingNarration = segmentIds.some((id) => !narrationBySegment.has(id));
  if (missingImage || missingNarration)
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "모든 Scene 이미지와 Narration Audio를 먼저 승인해 주세요.",
      ),
    );

  let timelineFrame = 0;
  const narrated = new Set<string>();
  const captionCues: ReturnType<typeof createCaptionCues> = [];
  const manifestScenes = scenes.map((scene) => {
    const sceneMappings = (mappings ?? []).filter(
      (mapping) => mapping.scene_id === scene.id,
    );
    let narrationFrame = 0;
    const narration = sceneMappings.flatMap((mapping) => {
      const segment = mapping.script_segments;
      if (narrated.has(segment.id)) return [];
      narrated.add(segment.id);
      const asset = narrationBySegment.get(segment.id);
      if (!asset) return [];
      const durationInFrames = millisecondsToFrames(
        segment.estimated_duration_ms ?? 8_000,
        fps,
      );
      captionCues.push(
        ...createCaptionCues({
          durationInFrames,
          fps,
          segmentId: segment.id,
          startFrame: timelineFrame + narrationFrame,
          text: segment.narration,
        }),
      );
      const clip = {
        segmentId: segment.id,
        startFrame: narrationFrame,
        durationInFrames,
        asset: manifestAsset(asset),
      };
      narrationFrame += durationInFrames;
      return [clip];
    });
    const durationInFrames = Math.max(
      millisecondsToFrames(scene.duration_ms ?? 10_000, fps),
      narrationFrame,
    );
    const result = {
      id: scene.id,
      position: scene.position,
      title: scene.title ?? `Scene ${scene.position + 1}`,
      startFrame: timelineFrame,
      durationInFrames,
      cameraMotion: cameraMotion(scene.camera_motion),
      image: manifestAsset(imageByScene.get(scene.id)!),
      narration,
    };
    timelineFrame += durationInFrames;
    return result;
  });

  const audioLayers = (layers ?? []).map((layer) => {
    const startFrame = Math.round((layer.start_ms / 1000) * fps);
    const endFrame = layer.end_ms
      ? Math.round((layer.end_ms / 1000) * fps)
      : timelineFrame;
    return {
      id: layer.id,
      type: layer.layer_type,
      label: layer.label,
      startFrame,
      durationInFrames: Math.max(
        1,
        Math.min(timelineFrame, endFrame) - startFrame,
      ),
      volumeDb: Number(layer.volume_db),
      fadeInFrames: Math.round((layer.fade_in_ms / 1000) * fps),
      fadeOutFrames: Math.round((layer.fade_out_ms / 1000) * fps),
      loop: layer.loop,
      asset: manifestAsset(layer.assets),
    };
  });
  const manifest = renderManifestSchema.parse({
    schemaVersion: 1,
    composition: {
      id: "KLoreEpisode",
      width: 1920,
      height: 1080,
      fps,
      durationInFrames: timelineFrame,
    },
    source: {
      episodeId: idea.episode_id,
      scenePlanVersionId: plan.id,
      scriptVersionId: plan.script_version_id,
    },
    scenes: manifestScenes,
    audioLayers,
    captions: {
      language: "en",
      style: captionStyleForCategory(
        idea.category_presets?.slug ?? "grandmas-tales",
      ),
      cues: captionCues,
    },
  });
  const { data, error } = await supabase.rpc("create_render_version", {
    p_episode_id: idea.episode_id,
    p_scene_plan_version_id: plan.id,
    p_manifest: manifest as unknown as Json,
  });
  if (error || !data?.[0])
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "Render Manifest 저장에 실패했습니다.",
      ),
    );
  revalidatePath("/");
  revalidatePath(`/stories/${parsed.data.ideaId}/render`);
  redirect(
    location(
      parsed.data.ideaId,
      "saved",
      `Render Manifest v${data[0].version}을 생성했습니다.`,
    ),
  );
}

export async function approveRenderVersionAction(formData: FormData) {
  const parsed = renderVersionApprovalSchema.safeParse({
    ideaId: formData.get("ideaId"),
    renderVersionId: formData.get("renderVersionId"),
  });
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+Manifest입니다.");
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("render_versions")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.renderVersionId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(
      location(parsed.data.ideaId, "error", "Manifest 승인에 실패했습니다."),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/render`);
  redirect(
    location(parsed.data.ideaId, "saved", "Manifest를 승인하고 잠갔습니다."),
  );
}

export async function enqueueRenderJobAction(formData: FormData) {
  const parsed = renderVersionApprovalSchema.safeParse({
    ideaId: formData.get("ideaId"),
    renderVersionId: formData.get("renderVersionId"),
  });
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+Manifest입니다.");
  const { supabase } = await requireWorkspace();
  const { data, error } = await supabase.rpc("enqueue_render_job", {
    p_render_version_id: parsed.data.renderVersionId,
  });
  if (error || !data?.[0])
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "승인된 Manifest만 MP4 렌더 대기열에 추가할 수 있습니다.",
      ),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/render`);
  redirect(
    location(
      parsed.data.ideaId,
      "saved",
      data[0].status === "succeeded"
        ? "이미 완료된 Render Job입니다."
        : "MP4 Render Job을 대기열에 추가했습니다.",
    ),
  );
}
