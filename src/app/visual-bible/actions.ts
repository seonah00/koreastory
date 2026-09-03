"use server";

import { createHash, randomUUID } from "node:crypto";
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

const bucket = "k-lore-assets";
const maxReferenceBytes = 7 * 1024 * 1024;
const acceptedTypes = new Map([
  [
    "image/jpeg",
    {
      extension: "jpg",
      signature: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8,
    },
  ],
  [
    "image/png",
    {
      extension: "png",
      signature: (b: Uint8Array) =>
        b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
    },
  ],
  [
    "image/webp",
    {
      extension: "webp",
      signature: (b: Uint8Array) =>
        String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...b.slice(8, 12)) === "WEBP",
    },
  ],
]);

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

export async function uploadBibleReferenceAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const label = String(formData.get("label") ?? "")
    .trim()
    .slice(0, 80);
  const file = formData.get("referenceImage");
  if (!entryId || !(file instanceof File) || !label)
    redirect(location("error", "Reference 이미지와 라벨을 확인해 주세요."));
  const format = acceptedTypes.get(file.type);
  if (!format || file.size <= 0 || file.size > maxReferenceBytes)
    redirect(
      location("error", "PNG, JPEG, WebP 이미지를 7MB 이하로 올려 주세요."),
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format.signature(bytes))
    redirect(location("error", "파일 내용과 이미지 형식이 일치하지 않습니다."));

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: entry } = await supabase
    .from("bible_entries")
    .select("id, kind, status")
    .eq("workspace_id", workspaceId)
    .eq("id", entryId)
    .maybeSingle();
  if (!entry || entry.status !== "approved" || entry.kind === "voice")
    redirect(
      location(
        "error",
        "승인된 Visual Bible 버전에만 이미지를 연결할 수 있습니다.",
      ),
    );

  const assetId = randomUUID();
  const storagePath = `${workspaceId}/bible/${entry.id}/references/${assetId}.${format.extension}`;
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  if (uploadError)
    redirect(location("error", "Reference 이미지 업로드에 실패했습니다."));
  const { data: last } = await supabase
    .from("bible_references")
    .select("position")
    .eq("workspace_id", workspaceId)
    .eq("bible_entry_id", entry.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error: assetError } = await supabase.from("assets").insert({
    id: assetId,
    workspace_id: workspaceId,
    kind: "image",
    storage_bucket: bucket,
    storage_path: storagePath,
    mime_type: file.type,
    bytes: file.size,
    checksum_sha256: checksum,
    metadata: {
      purpose: "bible_reference",
      bibleEntryId: entry.id,
      label,
      originalName: file.name,
    },
  });
  const { error: referenceError } = assetError
    ? { error: assetError }
    : await supabase.from("bible_references").insert({
        workspace_id: workspaceId,
        bible_entry_id: entry.id,
        asset_id: assetId,
        label,
        position: (last?.position ?? -1) + 1,
      });
  if (referenceError) {
    if (!assetError)
      await supabase
        .from("assets")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", assetId);
    await supabase.storage.from(bucket).remove([storagePath]);
    redirect(location("error", "Reference 등록을 완료하지 못했습니다."));
  }
  revalidatePath("/visual-bible");
  redirect(
    location(
      "saved",
      "Reference 이미지를 등록했습니다. 승인 후 생성에 사용됩니다.",
    ),
  );
}

export async function approveBibleReferenceAction(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "");
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("assets")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", assetId)
    .eq("status", "draft")
    .contains("metadata", { purpose: "bible_reference" })
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(location("error", "Reference 승인에 실패했습니다."));
  revalidatePath("/visual-bible");
  redirect(location("saved", "Reference 이미지를 승인하고 잠갔습니다."));
}
