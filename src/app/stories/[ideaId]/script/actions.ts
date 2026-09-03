"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveScriptSchema,
  manualScriptSchema,
  manualSegments,
  scriptRequestSchema,
} from "@/domain/script";
import { runOpenAIScript } from "@/server/ai/openai-script";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

function scriptLocation(
  ideaId: string,
  key: "saved" | "error",
  message: string,
) {
  return `/stories/${ideaId}/script?${key}=${encodeURIComponent(message)}`;
}

async function createVersion({
  briefId,
  episodeId,
  fullText,
  segments,
  supabase,
  title,
}: {
  briefId: string;
  episodeId: string;
  fullText: string;
  segments: Json;
  supabase: Awaited<ReturnType<typeof requireWorkspace>>["supabase"];
  title: string;
}) {
  const { data, error } = await supabase.rpc("create_script_version", {
    p_episode_id: episodeId,
    p_story_brief_version_id: briefId,
    p_title: title,
    p_full_text: fullText,
    p_segments: segments,
  });
  if (error || !data?.[0])
    throw new Error(error?.message ?? "Script save failed.");
  return data[0];
}

export async function generateScriptAction(formData: FormData) {
  const parsed = scriptRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+소재입니다.");

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    redirect(
      scriptLocation(
        parsed.data.ideaId,
        "error",
        "OPENAI_API_KEY 설정이 필요합니다.",
      ),
    );
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("id, title, synopsis, episode_id, category_presets(slug)")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id) {
    redirect(
      scriptLocation(
        parsed.data.ideaId,
        "error",
        "먼저 Story Brief를 생성해 주세요.",
      ),
    );
  }

  const [briefResult, evidenceResult] = await Promise.all([
    supabase
      .from("story_brief_versions")
      .select("id, content")
      .eq("workspace_id", workspaceId)
      .eq("episode_id", idea.episode_id)
      .order("version", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("research_evidence")
      .select("claim, evidence_excerpt")
      .eq("workspace_id", workspaceId)
      .eq("story_idea_id", idea.id)
      .order("confidence", { ascending: false })
      .limit(10),
  ]);
  if (!briefResult.data) {
    redirect(
      scriptLocation(idea.id, "error", "Story Brief를 불러오지 못했습니다."),
    );
  }

  const targetMinutes =
    briefResult.data.content &&
    typeof briefResult.data.content === "object" &&
    !Array.isArray(briefResult.data.content) &&
    typeof briefResult.data.content.targetDurationMinutes === "number"
      ? briefResult.data.content.targetDurationMinutes
      : 20;
  const request = {
    ideaId: idea.id,
    briefId: briefResult.data.id,
    targetMinutes,
    evidenceCount: evidenceResult.data?.length ?? 0,
  };
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      episode_id: idea.episode_id,
      provider: "openai",
      model: env.OPENAI_SCRIPT_MODEL,
      kind: "longform_script",
      status: "pending",
      request,
    })
    .select("id")
    .single();
  if (generationError) {
    redirect(
      scriptLocation(idea.id, "error", "대본 생성 기록을 만들지 못했습니다."),
    );
  }

  await supabase
    .from("generations")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", generation.id);

  try {
    const result = await runOpenAIScript({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_SCRIPT_MODEL,
      title: idea.title,
      synopsis: idea.synopsis ?? "No synopsis provided.",
      categorySlug: idea.category_presets?.slug ?? "grandmas-tales",
      brief: briefResult.data.content,
      evidence: (evidenceResult.data ?? []).map((item) => ({
        claim: item.claim,
        evidenceExcerpt: item.evidence_excerpt,
      })),
      targetMinutes,
    });
    const fullText = result.script.segments
      .map((segment) => segment.narration.trim())
      .join("\n\n");
    const version = await createVersion({
      supabase,
      episodeId: idea.episode_id,
      briefId: briefResult.data.id,
      title: result.script.title,
      fullText,
      segments: result.script.segments,
    });
    await supabase
      .from("generations")
      .update({
        status: "succeeded",
        response: {
          responseId: result.responseId,
          scriptVersionId: version.script_id,
          scriptVersion: version.version,
          wordCount: result.wordCount,
          segmentCount: result.script.segments.length,
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
        : "Unknown script error";
    await supabase
      .from("generations")
      .update({
        status: "failed",
        error: { message },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(
      scriptLocation(
        idea.id,
        "error",
        "대본 생성에 실패했습니다. 실행 기록에 원인이 보존되었습니다.",
      ),
    );
  }

  revalidatePath("/");
  revalidatePath(`/stories/${idea.id}/brief`);
  revalidatePath(`/stories/${idea.id}/script`);
  redirect(
    scriptLocation(
      idea.id,
      "saved",
      "영어 롱폼 대본 새 버전이 생성되었습니다.",
    ),
  );
}

export async function saveScriptVersionAction(formData: FormData) {
  const parsed = manualScriptSchema.safeParse({
    ideaId: formData.get("ideaId"),
    title: formData.get("title"),
    fullText: formData.get("fullText"),
  });
  const ideaId = String(formData.get("ideaId") ?? "");
  if (!parsed.success) {
    redirect(
      scriptLocation(
        ideaId,
        "error",
        "제목은 8자 이상, 대본은 500자 이상 입력해 주세요.",
      ),
    );
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("id, episode_id")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();
  if (!idea?.episode_id)
    redirect(
      scriptLocation(
        parsed.data.ideaId,
        "error",
        "에피소드를 찾지 못했습니다.",
      ),
    );
  const { data: brief } = await supabase
    .from("story_brief_versions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("episode_id", idea.episode_id)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (!brief)
    redirect(
      scriptLocation(idea.id, "error", "Story Brief를 찾지 못했습니다."),
    );

  try {
    await createVersion({
      supabase,
      episodeId: idea.episode_id,
      briefId: brief.id,
      title: parsed.data.title,
      fullText: parsed.data.fullText,
      segments: manualSegments(parsed.data.fullText),
    });
  } catch {
    redirect(
      scriptLocation(
        idea.id,
        "error",
        "수정본을 새 버전으로 저장하지 못했습니다.",
      ),
    );
  }
  revalidatePath(`/stories/${idea.id}/script`);
  redirect(
    scriptLocation(idea.id, "saved", "수정본을 새 버전으로 저장했습니다."),
  );
}

export async function approveScriptAction(formData: FormData) {
  const parsed = approveScriptSchema.safeParse({
    ideaId: formData.get("ideaId"),
    scriptId: formData.get("scriptId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+대본입니다.");

  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("script_versions")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.scriptId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(
      scriptLocation(parsed.data.ideaId, "error", "대본 승인에 실패했습니다."),
    );
  revalidatePath(`/stories/${parsed.data.ideaId}/script`);
  redirect(
    scriptLocation(parsed.data.ideaId, "saved", "대본을 승인하고 잠갔습니다."),
  );
}
