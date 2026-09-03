import { redirect } from "next/navigation";

import { createClient } from "@/server/supabase/server";

export async function requireWorkspace() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    throw new Error("개인 Workspace를 불러올 수 없습니다.");
  }

  return {
    supabase,
    userId,
    email:
      typeof claimsData.claims.email === "string"
        ? claimsData.claims.email
        : "Storyteller",
    workspaceId: membership.workspace_id,
    workspaceName: membership.workspaces?.name ?? "K-Lore Studio",
  };
}
