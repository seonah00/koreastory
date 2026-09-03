import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveRenderVersionAction,
  createRenderVersionAction,
} from "./actions";
import { RenderPreview } from "@/components/render-preview";
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
        .select("id, version, status, manifest, created_at")
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .order("version", { ascending: false })
    : { data: [] };
  const latest = versions?.[0] ?? null;
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
                <span className="rounded-full bg-[#e8f1e5] px-3 py-1.5 text-xs font-semibold text-[#31572d]">
                  Approved
                </span>
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

          <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <h2 className="text-xl font-semibold">Manifest 입력 고정</h2>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
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
