import Image from "next/image";
import Link from "next/link";

import { approveAssetAction } from "./actions";
import { StudioShell } from "@/components/studio-shell";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

type Search = Promise<Record<string, string | string[] | undefined>>;

function metaText(metadata: Json, key: string) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const value = metadata[key];
    return typeof value === "string" ? value : null;
  }
  return null;
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const [query, context] = await Promise.all([
    searchParams,
    requireWorkspace(),
  ]);
  const { supabase, workspaceId, workspaceName, email } = context;
  const { data } = await supabase
    .from("assets")
    .select(
      "id, episode_id, scene_id, script_segment_id, kind, storage_bucket, storage_path, status, metadata, bytes, created_at, episodes(working_title)",
    )
    .eq("workspace_id", workspaceId)
    .in("kind", ["image", "audio"])
    .order("created_at", { ascending: false })
    .limit(100);
  const assets = await Promise.all(
    (data ?? []).map(async (asset) => {
      const { data: signed } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signedUrl: signed?.signedUrl ?? null };
    }),
  );
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;

  return (
    <StudioShell active="Assets" email={email} workspaceName={workspaceName}>
      <p className="text-sm font-medium text-[var(--rust)]">ASSET LIBRARY</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
        이미지와 음성을 선택하고 재사용하세요.
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        모든 생성본은 비공개 Storage에 즉시 보존됩니다. 마음에 드는 이미지와
        음성만 승인하면 해당 버전이 잠깁니다.
      </p>
      {saved ? (
        <p
          className="mt-5 rounded-xl border border-[#b9d1b7] bg-[#eef7ec] px-4 py-3 text-sm text-[#31572d]"
          role="status"
        >
          {saved}
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      {assets.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]"
              key={asset.id}
            >
              {asset.signedUrl && asset.kind === "image" ? (
                <Image
                  alt={
                    metaText(asset.metadata, "title") ??
                    "K-Lore generated scene"
                  }
                  className="aspect-video w-full object-cover"
                  height={1024}
                  src={asset.signedUrl}
                  unoptimized
                  width={1536}
                />
              ) : asset.signedUrl && asset.kind === "audio" ? (
                <div className="grid min-h-44 place-items-center bg-white p-5">
                  <audio
                    className="w-full"
                    controls
                    preload="metadata"
                    src={asset.signedUrl}
                  >
                    오디오 재생을 지원하지 않는 브라우저입니다.
                  </audio>
                </div>
              ) : (
                <div className="grid aspect-video place-items-center text-sm text-[var(--muted)]">
                  미리보기를 불러올 수 없습니다.
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-[var(--rust)]">
                  {asset.episodes?.working_title ?? "K-Lore Episode"}
                </p>
                <h2 className="mt-1 font-semibold">
                  {metaText(asset.metadata, "title") ??
                    (asset.kind === "audio"
                      ? "Halmeoni Narration"
                      : "Generated Scene")}
                </h2>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--muted)] capitalize">
                    {asset.status} ·{" "}
                    {asset.bytes
                      ? `${Math.round(asset.bytes / 1024)} KB`
                      : asset.kind}
                  </span>
                  {asset.status === "draft" ? (
                    <form action={approveAssetAction}>
                      <button
                        className="rounded-full border border-[var(--pine)] px-4 py-2 text-xs font-semibold text-[var(--pine)]"
                        name="assetId"
                        value={asset.id}
                      >
                        승인·잠금
                      </button>
                    </form>
                  ) : (
                    <span className="rounded-full bg-[#eef7ec] px-3 py-1.5 text-xs text-[#31572d]">
                      Approved
                    </span>
                  )}
                </div>
                {asset.episode_id ? (
                  <Link
                    className="mt-3 block text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                    href={`/discover#saved-ideas`}
                  >
                    에피소드 목록으로 →
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="mt-10 rounded-2xl border border-dashed border-[var(--line)] px-6 py-16 text-center">
          <h2 className="text-xl font-semibold">아직 Asset이 없습니다.</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Scene 이미지 또는 Narration Audio를 생성하세요.
          </p>
        </section>
      )}
    </StudioShell>
  );
}
