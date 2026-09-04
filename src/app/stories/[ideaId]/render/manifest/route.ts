import { NextResponse } from "next/server";

import { renderManifestSchema } from "@/domain/render-manifest";
import { requireWorkspace } from "@/server/workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> },
) {
  const [{ ideaId }, { supabase, workspaceId }] = await Promise.all([
    params,
    requireWorkspace(),
  ]);
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("episode_id")
    .eq("workspace_id", workspaceId)
    .eq("id", ideaId)
    .maybeSingle();
  if (!idea?.episode_id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: render } = await supabase
    .from("render_versions")
    .select("version, manifest")
    .eq("workspace_id", workspaceId)
    .eq("episode_id", idea.episode_id)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsed = renderManifestSchema.safeParse(render?.manifest);
  if (!render || !parsed.success)
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

  return new NextResponse(JSON.stringify(parsed.data, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="k-lore-render-v${render.version}.json"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
