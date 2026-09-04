"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  captionsToSrt,
  captionsToWebVtt,
  renderManifestSchema,
  renderVersionApprovalSchema,
} from "@/domain/render-manifest";
import { requireWorkspace } from "@/server/workspace";

const bucket = "k-lore-assets";
const location = (ideaId: string, key: "saved" | "error", message: string) =>
  `/stories/${ideaId}/render?${key}=${encodeURIComponent(message)}`;

export async function createSubtitleExportsAction(formData: FormData) {
  const parsed = renderVersionApprovalSchema.safeParse({
    ideaId: formData.get("ideaId"),
    renderVersionId: formData.get("renderVersionId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+Render입니다.");

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: render } = await supabase
    .from("render_versions")
    .select("id, episode_id, status, output_asset_id, manifest")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.renderVersionId)
    .maybeSingle();
  const manifest = renderManifestSchema.safeParse(render?.manifest);
  if (
    !render ||
    render.status !== "approved" ||
    !render.output_asset_id ||
    !manifest.success ||
    !manifest.data.captions?.cues.length
  ) {
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "자막이 포함된 완료 Render Manifest가 필요합니다.",
      ),
    );
  }

  const { count } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("render_version_id", render.id)
    .eq("kind", "subtitle");
  if ((count ?? 0) >= 2) {
    redirect(
      location(parsed.data.ideaId, "saved", "자막 파일이 이미 준비되었습니다."),
    );
  }

  const fps = manifest.data.composition.fps;
  const files = [
    {
      extension: "vtt",
      mimeType: "text/vtt",
      bytes: Buffer.from(captionsToWebVtt(manifest.data.captions.cues, fps)),
    },
    {
      extension: "srt",
      mimeType: "application/x-subrip",
      bytes: Buffer.from(captionsToSrt(manifest.data.captions.cues, fps)),
    },
  ] as const;
  const paths = files.map(
    (file) =>
      `${workspaceId}/episodes/${render.episode_id}/subtitles/${render.id}.${file.extension}`,
  );

  for (let index = 0; index < files.length; index += 1) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(paths[index], files[index].bytes, {
        contentType: files[index].mimeType,
        upsert: false,
      });
    if (error) {
      await supabase.storage.from(bucket).remove(paths);
      redirect(
        location(
          parsed.data.ideaId,
          "error",
          "자막 파일 업로드에 실패했습니다.",
        ),
      );
    }
  }

  const checksums = files.map((file) =>
    createHash("sha256").update(file.bytes).digest("hex"),
  );
  const { data, error } = await supabase.rpc("create_subtitle_exports", {
    p_render_version_id: render.id,
    p_vtt_path: paths[0],
    p_vtt_bytes: files[0].bytes.byteLength,
    p_vtt_checksum_sha256: checksums[0],
    p_srt_path: paths[1],
    p_srt_bytes: files[1].bytes.byteLength,
    p_srt_checksum_sha256: checksums[1],
  });
  if (error || !data?.[0]?.vtt_asset_id || !data[0].srt_asset_id) {
    await supabase.storage.from(bucket).remove(paths);
    redirect(
      location(parsed.data.ideaId, "error", "자막 Asset 등록에 실패했습니다."),
    );
  }

  revalidatePath(`/stories/${parsed.data.ideaId}/render`);
  redirect(
    location(parsed.data.ideaId, "saved", "VTT·SRT 자막을 생성했습니다."),
  );
}

export async function markEpisodeReadyAction(formData: FormData) {
  const parsed = renderVersionApprovalSchema.safeParse({
    ideaId: formData.get("ideaId"),
    renderVersionId: formData.get("renderVersionId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+Render입니다.");
  const { supabase } = await requireWorkspace();
  const { data, error } = await supabase.rpc("mark_episode_ready", {
    p_render_version_id: parsed.data.renderVersionId,
  });
  if (error || !data) {
    redirect(
      location(
        parsed.data.ideaId,
        "error",
        "MP4와 VTT·SRT를 모두 준비한 뒤 완료할 수 있습니다.",
      ),
    );
  }
  revalidatePath("/");
  revalidatePath(`/stories/${parsed.data.ideaId}/render`);
  redirect(
    location(parsed.data.ideaId, "saved", "에피소드를 Ready로 완료했습니다."),
  );
}
