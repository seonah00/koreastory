"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assetApprovalSchema } from "@/domain/scene-image";
import { requireWorkspace } from "@/server/workspace";

export async function approveAssetAction(formData: FormData) {
  const parsed = assetApprovalSchema.safeParse({
    assetId: formData.get("assetId"),
  });
  if (!parsed.success) redirect("/assets?error=올바르지+않은+Asset입니다.");
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("assets")
    .update({ status: "approved" })
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.assetId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect("/assets?error=Asset+승인에+실패했습니다.");
  revalidatePath("/assets");
  redirect("/assets?saved=Asset을+승인하고+잠갔습니다.");
}
