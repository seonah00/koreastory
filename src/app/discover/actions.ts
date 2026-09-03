"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  briefSchema,
  customIdeaSchema,
  getStarterIdea,
  saveIdeaSchema,
} from "@/domain/discovery";
import { requireWorkspace } from "@/server/workspace";

function locationWithMessage(
  path: string,
  key: "error" | "saved",
  message: string,
) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

export async function saveStarterIdeaAction(formData: FormData) {
  const parsed = saveIdeaSchema.safeParse({
    starterId: formData.get("starterId"),
  });
  const starter = parsed.success
    ? getStarterIdea(parsed.data.starterId)
    : undefined;

  if (!starter)
    redirect(
      locationWithMessage(
        "/discover",
        "error",
        "추천 소재를 찾을 수 없습니다.",
      ),
    );

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: preset } = await supabase
    .from("category_presets")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", starter.category)
    .single();

  if (!preset)
    redirect(
      locationWithMessage(
        "/discover",
        "error",
        "카테고리 프리셋을 불러올 수 없습니다.",
      ),
    );

  const { data: existing } = await supabase
    .from("story_ideas")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category_preset_id", preset.id)
    .eq("title", starter.title)
    .maybeSingle();

  if (existing) redirect(`/stories/${existing.id}/brief`);

  const { data, error } = await supabase
    .from("story_ideas")
    .insert({
      workspace_id: workspaceId,
      category_preset_id: preset.id,
      title: starter.title,
      source_kind: starter.sourceKind,
      synopsis: starter.synopsis,
      scores: starter.scores,
      rationale: starter.rationale,
    })
    .select("id")
    .single();

  if (error)
    redirect(
      locationWithMessage("/discover", "error", "소재를 저장하지 못했습니다."),
    );

  revalidatePath("/");
  revalidatePath("/discover");
  redirect(
    `/stories/${data.id}/brief?starter=${encodeURIComponent(starter.id)}`,
  );
}

export async function saveCustomIdeaAction(formData: FormData) {
  const parsed = customIdeaSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    synopsis: formData.get("synopsis"),
  });

  if (!parsed.success)
    redirect(
      locationWithMessage(
        "/discover",
        "error",
        "제목과 줄거리를 확인해 주세요.",
      ),
    );

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: preset } = await supabase
    .from("category_presets")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", parsed.data.category)
    .single();

  if (!preset)
    redirect(
      locationWithMessage(
        "/discover",
        "error",
        "카테고리 프리셋을 불러올 수 없습니다.",
      ),
    );

  const { data, error } = await supabase
    .from("story_ideas")
    .insert({
      workspace_id: workspaceId,
      category_preset_id: preset.id,
      title: parsed.data.title,
      synopsis: parsed.data.synopsis,
      source_kind: "manual",
      rationale:
        "직접 추가한 소재입니다. Story Brief에서 글로벌 후크와 각색 방향을 확정하세요.",
    })
    .select("id")
    .single();

  if (error)
    redirect(
      locationWithMessage("/discover", "error", "소재를 저장하지 못했습니다."),
    );

  revalidatePath("/");
  revalidatePath("/discover");
  redirect(`/stories/${data.id}/brief`);
}

export async function createBriefAction(formData: FormData) {
  const parsed = briefSchema.safeParse({
    ideaId: formData.get("ideaId"),
    globalHook: formData.get("globalHook"),
    coreEmotion: formData.get("coreEmotion"),
    adaptationDirection: formData.get("adaptationDirection"),
    audiencePromise: formData.get("audiencePromise"),
    mood: formData.get("mood"),
    targetDurationMinutes: formData.get("targetDurationMinutes"),
  });

  const ideaId =
    typeof formData.get("ideaId") === "string"
      ? String(formData.get("ideaId"))
      : "";
  if (!parsed.success)
    redirect(
      locationWithMessage(
        `/stories/${ideaId}/brief`,
        "error",
        "Story Brief 입력 내용을 확인해 주세요.",
      ),
    );

  const { supabase } = await requireWorkspace();
  const { data, error } = await supabase.rpc("create_story_brief_from_idea", {
    p_idea_id: parsed.data.ideaId,
    p_target_duration_seconds: parsed.data.targetDurationMinutes * 60,
    p_content: {
      globalHook: parsed.data.globalHook,
      coreEmotion: parsed.data.coreEmotion,
      adaptationDirection: parsed.data.adaptationDirection,
      audiencePromise: parsed.data.audiencePromise,
      mood: parsed.data.mood,
      targetDurationMinutes: parsed.data.targetDurationMinutes,
      language: "en",
    },
  });

  const result = data?.[0];
  if (error || !result)
    redirect(
      locationWithMessage(
        `/stories/${parsed.data.ideaId}/brief`,
        "error",
        "Brief를 생성하지 못했습니다. 이미 생성된 소재인지 확인해 주세요.",
      ),
    );

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath(`/stories/${parsed.data.ideaId}/brief`);
  redirect(
    `/stories/${parsed.data.ideaId}/brief?saved=Story+Brief가+생성되었습니다.`,
  );
}
