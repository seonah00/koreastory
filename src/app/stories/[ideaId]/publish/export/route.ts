import { NextResponse } from "next/server";

import {
  packageToText,
  publishPackageContentSchema,
} from "@/domain/publish-package";
import { requireWorkspace } from "@/server/workspace";

export async function GET(
  request: Request,
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
  const { data: pack } = await supabase
    .from("publish_package_versions")
    .select("version, content")
    .eq("workspace_id", workspaceId)
    .eq("episode_id", idea.episode_id)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const content = publishPackageContentSchema.safeParse(pack?.content);
  if (!pack || !content.success)
    return NextResponse.json(
      { error: "Approved package not found" },
      { status: 404 },
    );

  const asText = new URL(request.url).searchParams.get("format") === "text";
  return new NextResponse(
    asText
      ? packageToText(content.data)
      : JSON.stringify(content.data, null, 2),
    {
      headers: {
        "Content-Disposition": `attachment; filename="k-lore-youtube-v${pack.version}.${asText ? "txt" : "json"}"`,
        "Content-Type": asText
          ? "text/plain; charset=utf-8"
          : "application/json; charset=utf-8",
      },
    },
  );
}
