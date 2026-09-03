"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveBibleEntrySchema,
  bibleEntryVersionSchema,
  categoryVisualPresetSchema,
  newBibleEntrySchema,
} from "@/domain/visual-bible";
import type { Json } from "@/server/supabase/database.types";
import type { createClient } from "@/server/supabase/server";
import { requireWorkspace } from "@/server/workspace";

function location(key: "saved" | "error", message: string) {
  return `/visual-bible?${key}=${encodeURIComponent(message)}`;
}

async function createVersion({
  supabase,
  workspaceId,
  content,
  kind,
  name,
  slug,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
  content: Json;
  kind: string;
  name: string;
  slug: string;
}) {
  const { data, error } = await supabase.rpc("create_bible_entry_version", {
    p_workspace_id: workspaceId,
    p_kind: kind,
    p_slug: slug,
    p_name: name,
    p_content: content,
  });
  if (error || !data?.[0])
    throw new Error(error?.message ?? "Bible save failed.");
  return data[0];
}

export async function saveBibleVersionAction(formData: FormData) {
  const parsed = bibleEntryVersionSchema.safeParse({
    entryId: formData.get("entryId"),
    kind: formData.get("kind"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    redirect(location("error", "Bible 이름과 JSON 내용을 확인해 주세요."));
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: source } = await supabase
    .from("bible_entries")
    .select("kind, slug")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.entryId)
    .maybeSingle();
  if (
    !source ||
    source.kind !== parsed.data.kind ||
    source.slug !== parsed.data.slug
  ) {
    redirect(location("error", "기준 Bible 항목을 찾지 못했습니다."));
  }

  try {
    await createVersion({
      supabase,
      workspaceId,
      kind: source.kind,
      slug: source.slug,
      name: parsed.data.name,
      content: parsed.data.content as Json,
    });
  } catch {
    redirect(location("error", "Bible 새 버전을 저장하지 못했습니다."));
  }
  revalidatePath("/visual-bible");
  redirect(location("saved", "Bible 수정본을 새 버전으로 저장했습니다."));
}

export async function createBibleEntryAction(formData: FormData) {
  const parsed = newBibleEntrySchema.safeParse({
    kind: formData.get("kind"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    redirect(
      location("error", "새 Bible 항목의 입력값과 JSON을 확인해 주세요."),
    );
  }
  const { supabase, workspaceId } = await requireWorkspace();
  try {
    await createVersion({
      supabase,
      workspaceId,
      kind: parsed.data.kind,
      slug: parsed.data.slug,
      name: parsed.data.name,
      content: parsed.data.content as Json,
    });
  } catch {
    redirect(
      location("error", "같은 항목이 있거나 새 Bible을 저장하지 못했습니다."),
    );
  }
  revalidatePath("/visual-bible");
  redirect(location("saved", "새 Bible 항목을 생성했습니다."));
}

export async function approveBibleEntryAction(formData: FormData) {
  const parsed = approveBibleEntrySchema.safeParse({
    entryId: formData.get("entryId"),
  });
  if (!parsed.success)
    redirect(location("error", "올바르지 않은 Bible 항목입니다."));

  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("bible_entries")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.entryId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(location("error", "Bible 승인에 실패했습니다."));
  revalidatePath("/visual-bible");
  redirect(location("saved", "Bible 버전을 승인하고 잠갔습니다."));
}

export async function saveCategoryVisualPresetAction(formData: FormData) {
  const parsed = categoryVisualPresetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    palette: formData.get("palette"),
    lighting: formData.get("lighting"),
    composition: formData.get("composition"),
    atmosphere: formData.get("atmosphere"),
    styleModifiers: formData.get("styleModifiers"),
  });
  if (!parsed.success) {
    redirect(
      location("error", "카테고리 이미지 프리셋 입력값을 확인해 주세요."),
    );
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("category_presets")
    .update({
      visual_rules: {
        palette: parsed.data.palette,
        lighting: parsed.data.lighting,
        composition: parsed.data.composition,
        atmosphere: parsed.data.atmosphere,
        styleModifiers: parsed.data.styleModifiers,
      },
    })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.categoryId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    redirect(location("error", "카테고리 이미지 프리셋 저장에 실패했습니다."));
  }
  revalidatePath("/visual-bible");
  redirect(location("saved", "카테고리 이미지 프리셋을 저장했습니다."));
}
