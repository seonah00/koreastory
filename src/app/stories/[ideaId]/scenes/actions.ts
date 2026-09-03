"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveScenePlanSchema,
  generatedScenePlanSchema,
  scenePlanRequestSchema,
} from "@/domain/scene-plan";
import { runOpenAIScenePlan } from "@/server/ai/openai-scene-plan";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

function sceneLocation(
  ideaId: string,
  key: "saved" | "error",
  message: string,
) {
  return `/stories/${ideaId}/scenes?${key}=${encodeURIComponent(message)}`;
}

async function createScenePlan({
  episodeId,
  scenes,
  scriptVersionId,
  supabase,
}: {
  episodeId: string;
  scenes: Json;
  scriptVersionId: string;
  supabase: Awaited<ReturnType<typeof requireWorkspace>>["supabase"];
}) {
  const { data, error } = await supabase.rpc("create_scene_plan_version", {
    p_episode_id: episodeId,
    p_script_version_id: scriptVersionId,
    p_scenes: scenes,
  });
  if (error || !data?.[0]) {
    throw new Error(error?.message ?? "Scene plan save failed.");
  }
  return data[0];
}

export async function generateScenePlanAction(formData: FormData) {
  const parsed = scenePlanRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+소재입니다.");

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    redirect(
      sceneLocation(
        parsed.data.ideaId,
        "error",
        "OPENAI_API_KEY 설정이 필요합니다.",
      ),
    );
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("id, episode_id, category_presets(slug)")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id) {
    redirect(
      sceneLocation(
        parsed.data.ideaId,
        "error",
        "먼저 대본을 생성하고 승인해 주세요.",
      ),
    );
  }

  const { data: script } = await supabase
    .from("script_versions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("episode_id", idea.episode_id)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!script) {
    redirect(sceneLocation(idea.id, "error", "승인된 영어 대본이 필요합니다."));
  }

  const [{ data: segments }, { data: episode }] = await Promise.all([
    supabase
      .from("script_segments")
      .select("position, narration, emotion, estimated_duration_ms")
      .eq("workspace_id", workspaceId)
      .eq("script_version_id", script.id)
      .order("position"),
    supabase
      .from("episodes")
      .select("target_duration_seconds")
      .eq("workspace_id", workspaceId)
      .eq("id", idea.episode_id)
      .single(),
  ]);
  if (!segments?.length || !episode) {
    redirect(
      sceneLocation(idea.id, "error", "승인 대본 구간을 불러오지 못했습니다."),
    );
  }

  const request = {
    ideaId: idea.id,
    scriptVersionId: script.id,
    scriptSegmentCount: segments.length,
  };
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      episode_id: idea.episode_id,
      provider: "openai",
      model: env.OPENAI_SCENE_MODEL,
      kind: "scene_plan",
      status: "pending",
      request,
    })
    .select("id")
    .single();
  if (generationError) {
    redirect(
      sceneLocation(
        idea.id,
        "error",
        "Scene Plan 생성 기록을 만들지 못했습니다.",
      ),
    );
  }

  await supabase
    .from("generations")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", generation.id);

  try {
    const result = await runOpenAIScenePlan({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_SCENE_MODEL,
      categorySlug: idea.category_presets?.slug ?? "grandmas-tales",
      targetMinutes: Math.max(
        10,
        Math.round((episode.target_duration_seconds ?? 1200) / 60),
      ),
      scriptSegments: segments.map((segment) => ({
        position: segment.position,
        narration: segment.narration,
        emotion: segment.emotion,
        estimatedDurationMs: segment.estimated_duration_ms,
      })),
    });
    const version = await createScenePlan({
      supabase,
      episodeId: idea.episode_id,
      scriptVersionId: script.id,
      scenes: result.plan.scenes,
    });
    await supabase
      .from("generations")
      .update({
        status: "succeeded",
        response: {
          responseId: result.responseId,
          scenePlanId: version.scene_plan_id,
          scenePlanVersion: version.version,
          sceneCount: result.plan.scenes.length,
        },
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 1000)
        : "Unknown scene-plan error";
    await supabase
      .from("generations")
      .update({
        status: "failed",
        error: { message },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(
      sceneLocation(
        idea.id,
        "error",
        "Scene Plan 생성에 실패했습니다. 실행 기록에 원인이 보존되었습니다.",
      ),
    );
  }

  revalidatePath("/");
  revalidatePath(`/stories/${idea.id}/script`);
  revalidatePath(`/stories/${idea.id}/scenes`);
  redirect(
    sceneLocation(idea.id, "saved", "Scene Plan 새 버전이 생성되었습니다."),
  );
}

export async function saveScenePlanVersionAction(formData: FormData) {
  const request = scenePlanRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
  });
  const scriptVersionId = String(formData.get("scriptVersionId") ?? "");
  const count = Number(formData.get("sceneCount"));
  if (!request.success || !Number.isInteger(count) || count < 4 || count > 20) {
    redirect("/discover?error=올바르지+않은+Scene+Plan입니다.");
  }

  const rawScenes = Array.from({ length: count }, (_, index) => ({
    title: formData.get(`title-${index}`),
    description: formData.get(`description-${index}`),
    visualPrompt: formData.get(`visualPrompt-${index}`),
    negativePrompt: formData.get(`negativePrompt-${index}`),
    cameraMotion: formData.get(`cameraMotion-${index}`),
    ambience: formData.get(`ambience-${index}`),
    durationSeconds: Number(formData.get(`durationSeconds-${index}`)),
    scriptSegmentPositions: String(
      formData.get(`scriptSegmentPositions-${index}`) ?? "",
    )
      .split(",")
      .map((value) => Number(value.trim())),
  }));
  const plan = generatedScenePlanSchema.safeParse({ scenes: rawScenes });
  if (!plan.success) {
    redirect(
      sceneLocation(
        request.data.ideaId,
        "error",
        "장면 입력값을 확인해 주세요.",
      ),
    );
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("id, episode_id")
    .eq("workspace_id", workspaceId)
    .eq("id", request.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id) {
    redirect(
      sceneLocation(
        request.data.ideaId,
        "error",
        "에피소드를 찾지 못했습니다.",
      ),
    );
  }
  try {
    await createScenePlan({
      supabase,
      episodeId: idea.episode_id,
      scriptVersionId,
      scenes: plan.data.scenes,
    });
  } catch {
    redirect(
      sceneLocation(
        idea.id,
        "error",
        "수정한 Scene Plan을 새 버전으로 저장하지 못했습니다.",
      ),
    );
  }
  revalidatePath(`/stories/${idea.id}/scenes`);
  redirect(
    sceneLocation(
      idea.id,
      "saved",
      "수정본을 새 Scene Plan 버전으로 저장했습니다.",
    ),
  );
}

export async function approveScenePlanAction(formData: FormData) {
  const parsed = approveScenePlanSchema.safeParse({
    ideaId: formData.get("ideaId"),
    scenePlanId: formData.get("scenePlanId"),
  });
  if (!parsed.success)
    redirect("/discover?error=올바르지+않은+Scene+Plan입니다.");

  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("scene_plan_versions")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.scenePlanId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    redirect(
      sceneLocation(
        parsed.data.ideaId,
        "error",
        "Scene Plan 승인에 실패했습니다.",
      ),
    );
  }
  revalidatePath(`/stories/${parsed.data.ideaId}/scenes`);
  redirect(
    sceneLocation(
      parsed.data.ideaId,
      "saved",
      "Scene Plan을 승인하고 잠갔습니다.",
    ),
  );
}
