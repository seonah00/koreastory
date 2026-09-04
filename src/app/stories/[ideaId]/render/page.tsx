import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveRenderVersionAction,
  createRenderVersionAction,
  enqueueRenderJobAction,
} from "./actions";
import {
  createSubtitleExportsAction,
  markEpisodeReadyAction,
} from "./export-actions";
import { RenderPreview } from "@/components/render-preview";
import { RenderJobStatus } from "@/components/render-job-status";
import { StudioShell } from "@/components/studio-shell";
import {
  renderManifestSchema,
  type RenderAsset,
  type ResolvedRenderManifest,
} from "@/domain/render-manifest";
import { requireWorkspace } from "@/server/workspace";

async function resolveManifest(
  manifest: ReturnType<typeof renderManifestSchema.parse>,
  supabase: Awaited<ReturnType<typeof requireWorkspace>>["supabase"],
) {
  const assets = [
    ...manifest.scenes.flatMap((scene) => [
      scene.image,
      ...scene.narration.map((clip) => clip.asset),
    ]),
    ...manifest.audioLayers.map((layer) => layer.asset),
  ];
  const unique = new Map(assets.map((asset) => [asset.id, asset]));
  const urls = new Map<string, string>();
  await Promise.all(
    [...unique.values()].map(async (asset) => {
      const { data } = await supabase.storage
        .from(asset.bucket)
        .createSignedUrl(asset.path, 3600);
      if (data?.signedUrl) urls.set(asset.id, data.signedUrl);
    }),
  );
  if (urls.size !== unique.size) return null;
  const resolveAsset = (asset: RenderAsset) => ({
    ...asset,
    url: urls.get(asset.id)!,
  });
  return {
    ...manifest,
    scenes: manifest.scenes.map((scene) => ({
      ...scene,
      image: resolveAsset(scene.image),
      narration: scene.narration.map((clip) => ({
        ...clip,
        asset: resolveAsset(clip.asset),
      })),
    })),
    audioLayers: manifest.audioLayers.map((layer) => ({
      ...layer,
      asset: resolveAsset(layer.asset),
    })),
  } satisfies ResolvedRenderManifest;
}

export default async function RenderStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ ideaId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ ideaId }, query, context] = await Promise.all([
    params,
    searchParams,
    requireWorkspace(),
  ]);
  const { supabase, workspaceId, workspaceName, email } = context;
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("id, title, episode_id, category_presets(name)")
    .eq("workspace_id", workspaceId)
    .eq("id", ideaId)
    .maybeSingle();
  if (!idea) notFound();

  const { data: versions } = idea.episode_id
    ? await supabase
        .from("render_versions")
        .select(
          "id, version, status, manifest, created_at, output_asset_id, assets!render_versions_output_asset_workspace_fkey(storage_bucket, storage_path, bytes)",
        )
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .order("version", { ascending: false })
    : { data: [] };
  const latest = versions?.[0] ?? null;
  const [{ data: episode }, { data: subtitleAssets }] = await Promise.all([
    idea.episode_id
      ? supabase
          .from("episodes")
          .select("stage")
          .eq("workspace_id", workspaceId)
          .eq("id", idea.episode_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    latest
      ? supabase
          .from("assets")
          .select("id, storage_bucket, storage_path, metadata")
          .eq("workspace_id", workspaceId)
          .eq("render_version_id", latest.id)
          .eq("kind", "subtitle")
          .eq("status", "approved")
      : Promise.resolve({ data: [] }),
  ]);
  const { data: jobs } = latest
    ? await supabase
        .from("jobs")
        .select(
          "id, status, progress, attempt, max_attempts, error, updated_at",
        )
        .eq("workspace_id", workspaceId)
        .eq("render_version_id", latest.id)
        .eq("kind", "render_mp4")
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] };
  const renderJob = jobs?.[0] ?? null;
  const { data: outputUrl } = latest?.assets
    ? await supabase.storage
        .from(latest.assets.storage_bucket)
        .createSignedUrl(latest.assets.storage_path, 3600)
    : { data: null };
  const subtitleUrls = new Map<string, string>();
  await Promise.all(
    (subtitleAssets ?? []).map(async (asset) => {
      const format =
        asset.metadata &&
        typeof asset.metadata === "object" &&
        !Array.isArray(asset.metadata) &&
        typeof asset.metadata.format === "string"
          ? asset.metadata.format
          : null;
      if (!format) return;
      const { data } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);
      if (data?.signedUrl) subtitleUrls.set(format, data.signedUrl);
    }),
  );
  const parsed = latest
    ? renderManifestSchema.safeParse(latest.manifest)
    : null;
  const preview = parsed?.success
    ? await resolveManifest(parsed.data, supabase)
    : null;
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;

  return (
    <StudioShell active="Stories" email={email} workspaceName={workspaceName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          href={`/stories/${idea.id}/audio`}
        >
          ← Audio Studio로 돌아가기
        </Link>
        <span className="text-sm font-medium text-[var(--rust)]">
          {idea.category_presets?.name}
        </span>
      </div>
      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-medium text-[var(--rust)]">
            RENDER STUDIO
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
            {idea.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            승인된 Scene 이미지, Halmeoni Narration, BGM·Ambience·SFX를 하나의
            결정적 Manifest로 고정하고 Remotion Composition으로 조립합니다.
          </p>
        </div>
        <form action={createRenderVersionAction}>
          <input name="ideaId" type="hidden" value={idea.id} />
          <button
            className="rounded-full bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            {latest ? "새 Manifest 버전 생성" : "Render Manifest 생성"}
          </button>
        </form>
      </div>

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

      {latest && parsed?.success ? (
        <>
          <section className="mt-9 grid gap-4 sm:grid-cols-4">
            {[
              ["Manifest", `v${latest.version}`],
              ["Status", latest.status],
              ["Scenes", String(parsed.data.scenes.length)],
              [
                "Duration",
                `${Math.ceil(parsed.data.composition.durationInFrames / parsed.data.composition.fps / 60)} min`,
              ],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4"
                key={label}
              >
                <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
                  {label}
                </p>
                <p className="mt-2 text-lg font-semibold capitalize">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Remotion Preview</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  1920×1080 · 30fps · 저자극 Ken Burns motion
                </p>
              </div>
              {latest.status === "draft" ? (
                <form action={approveRenderVersionAction}>
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <button
                    className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                    name="renderVersionId"
                    value={latest.id}
                  >
                    승인·잠금
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#e8f1e5] px-3 py-1.5 text-xs font-semibold text-[#31572d]">
                    Approved
                  </span>
                  {!latest.output_asset_id ? (
                    <form action={enqueueRenderJobAction}>
                      <input name="ideaId" type="hidden" value={idea.id} />
                      <button
                        className="rounded-full bg-[var(--pine)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
                        disabled={
                          renderJob?.status === "pending" ||
                          renderJob?.status === "running"
                        }
                        name="renderVersionId"
                        value={latest.id}
                      >
                        {renderJob?.status === "running"
                          ? `렌더링 ${Math.round(Number(renderJob.progress))}%`
                          : renderJob?.status === "pending"
                            ? "렌더 대기 중"
                            : "MP4 렌더 시작"}
                      </button>
                    </form>
                  ) : null}
                </div>
              )}
            </div>
            <div className="mt-5">
              {preview ? (
                <RenderPreview manifest={preview} />
              ) : (
                <p className="rounded-xl bg-[#fff7df] p-4 text-sm text-[#735718]">
                  일부 private Asset URL을 만들지 못해 Preview를 표시할 수
                  없습니다.
                </p>
              )}
            </div>
          </section>

          {renderJob || outputUrl?.signedUrl ? (
            <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
              <h2 className="text-xl font-semibold">MP4 Render</h2>
              {renderJob ? (
                <div className="mt-4">
                  <RenderJobStatus
                    attempt={renderJob.attempt}
                    maxAttempts={renderJob.max_attempts}
                    progress={Number(renderJob.progress)}
                    status={renderJob.status}
                  />
                </div>
              ) : null}
              {outputUrl?.signedUrl ? (
                <div className="mt-5">
                  <video
                    className="aspect-video w-full rounded-xl bg-black"
                    controls
                    preload="metadata"
                    src={outputUrl.signedUrl}
                  >
                    영상 재생을 지원하지 않는 브라우저입니다.
                  </video>
                  <a
                    className="mt-4 inline-flex rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                    download
                    href={outputUrl.signedUrl}
                  >
                    MP4 다운로드
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          {latest.output_asset_id ? (
            <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-[var(--rust)] uppercase">
                    Final Review &amp; Export
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    게시 패키지 확인
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    MP4·자막·Manifest를 내려받고 검수가 끝나면 Ready로 넘깁니다.
                  </p>
                </div>
                <span className="rounded-full bg-[#f3eee4] px-3 py-1.5 text-xs font-semibold capitalize">
                  {episode?.stage ?? "review"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["MP4", outputUrl?.signedUrl ? "Ready" : "Missing"],
                  [
                    "Captions",
                    `${parsed.data.captions?.cues.length ?? 0} cues`,
                  ],
                  ["VTT", subtitleUrls.has("vtt") ? "Ready" : "Missing"],
                  ["SRT", subtitleUrls.has("srt") ? "Ready" : "Missing"],
                ].map(([label, value]) => (
                  <div className="rounded-xl bg-white p-4" key={label}>
                    <p className="text-xs text-[var(--muted)] uppercase">
                      {label}
                    </p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {!parsed.data.captions?.cues.length ? (
                <p className="mt-4 rounded-xl bg-[#fff7df] p-4 text-sm text-[#735718]">
                  이 Manifest에는 자막이 없습니다. 새 Manifest 버전을 생성하고
                  승인한 뒤 다시 렌더해 주세요.
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {outputUrl?.signedUrl ? (
                  <a
                    className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                    download
                    href={outputUrl.signedUrl}
                  >
                    MP4
                  </a>
                ) : null}
                {(["vtt", "srt"] as const).map((format) =>
                  subtitleUrls.get(format) ? (
                    <a
                      className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)] uppercase"
                      download
                      href={subtitleUrls.get(format)}
                      key={format}
                    >
                      {format}
                    </a>
                  ) : null,
                )}
                <a
                  className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                  download
                  href={`/stories/${idea.id}/render/manifest`}
                >
                  Manifest JSON
                </a>
                {parsed.data.captions?.cues.length && subtitleUrls.size < 2 ? (
                  <form action={createSubtitleExportsAction}>
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <button
                      className="rounded-full bg-[var(--pine)] px-4 py-2 text-sm font-semibold text-white"
                      name="renderVersionId"
                      value={latest.id}
                    >
                      VTT·SRT 생성
                    </button>
                  </form>
                ) : null}
                {outputUrl?.signedUrl &&
                subtitleUrls.size >= 2 &&
                episode?.stage !== "ready" ? (
                  <form action={markEpisodeReadyAction}>
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <button
                      className="rounded-full bg-[var(--rust)] px-4 py-2 text-sm font-semibold text-white"
                      name="renderVersionId"
                      value={latest.id}
                    >
                      검수 완료 · Ready
                    </button>
                  </form>
                ) : null}
                {episode?.stage === "ready" ||
                episode?.stage === "published" ? (
                  <Link
                    className="rounded-full bg-[var(--rust)] px-4 py-2 text-sm font-semibold text-white"
                    href={`/stories/${idea.id}/publish`}
                  >
                    YouTube 패키지 만들기 →
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <h2 className="text-xl font-semibold">Manifest 입력 고정</h2>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-4">
              <li className="rounded-xl bg-white p-4">
                Scene 이미지 {parsed.data.scenes.length}개
              </li>
              <li className="rounded-xl bg-white p-4">
                Narration{" "}
                {parsed.data.scenes.reduce(
                  (sum, scene) => sum + scene.narration.length,
                  0,
                )}
                개
              </li>
              <li className="rounded-xl bg-white p-4">
                Audio Layer {parsed.data.audioLayers.length}개
              </li>
              <li className="rounded-xl bg-white p-4">
                Caption {parsed.data.captions?.cues.length ?? 0}개
              </li>
            </ul>
          </section>
        </>
      ) : latest ? (
        <p className="mt-8 rounded-xl bg-[#fff0ed] p-4 text-sm text-[#8a3027]">
          저장된 Manifest 형식이 현재 스키마와 맞지 않습니다. 새 버전을 생성해
          주세요.
        </p>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
          아직 Render Manifest가 없습니다. 모든 제작 자산을 승인한 뒤
          생성하세요.
        </p>
      )}

      {versions && versions.length > 1 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Version history</h2>
          <div className="mt-4 space-y-2">
            {versions.map((version) => (
              <div
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                key={version.id}
              >
                <span>Manifest v{version.version}</span>
                <span className="text-[var(--muted)] capitalize">
                  {version.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </StudioShell>
  );
}
