import { createElement } from "react";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { publishPackageContentSchema } from "@/domain/publish-package";
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
  const { data: pack } = await supabase
    .from("publish_package_versions")
    .select(
      "content, assets!publish_packages_thumbnail_workspace_fkey(storage_bucket, storage_path, status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("episode_id", idea.episode_id)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const content = publishPackageContentSchema.safeParse(pack?.content);
  if (!pack?.assets || pack.assets.status !== "approved" || !content.success)
    return NextResponse.json(
      { error: "Approved thumbnail not found" },
      { status: 404 },
    );
  const { data: signed } = await supabase.storage
    .from(pack.assets.storage_bucket)
    .createSignedUrl(pack.assets.storage_path, 60);
  if (!signed?.signedUrl)
    return NextResponse.json(
      { error: "Thumbnail unavailable" },
      { status: 502 },
    );

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          alignItems: "flex-end",
          backgroundColor: "#171913",
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,.02) 62%), url(${signed.signedUrl})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          display: "flex",
          height: "100%",
          padding: "64px",
          width: "100%",
        },
      },
      createElement(
        "div",
        {
          style: {
            color: "white",
            display: "flex",
            fontSize: 82,
            fontWeight: 900,
            letterSpacing: "-3px",
            lineHeight: 1,
            maxWidth: "78%",
            textShadow: "0 4px 18px rgba(0,0,0,.9)",
          },
        },
        content.data.thumbnail.headline,
      ),
    ),
    {
      height: 720,
      headers: {
        "Content-Disposition": 'attachment; filename="k-lore-thumbnail.png"',
      },
      width: 1280,
    },
  );
}
