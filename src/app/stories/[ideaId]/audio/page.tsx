import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveNarrationAudioAction,
  generateNarrationAudioAction,
} from "./actions";
import { StudioShell } from "@/components/studio-shell";
import { getServerEnv } from "@/server/env";
import { requireWorkspace } from "@/server/workspace";

export const maxDuration = 300;

export default async function AudioStudioPage({
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
  const { data: script } = idea.episode_id
    ? await supabase
        .from("script_versions")
        .select("id, version, status")
        .eq("workspace_id", workspaceId)
        .eq("episode_id", idea.episode_id)
        .eq("status", "approved")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const [segmentsResult, assetsResult, generationsResult, voiceResult] = script
    ? await Promise.all([
        supabase
          .from("script_segments")
          .select("id, position, narration, emotion, estimated_duration_ms")
          .eq("workspace_id", workspaceId)
          .eq("script_version_id", script.id)
          .order("position"),
        supabase
          .from("assets")
          .select(
            "id, script_segment_id, storage_bucket, storage_path, status, bytes, metadata, created_at",
          )
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id ?? "")
          .eq("kind", "audio")
          .order("created_at", { ascending: false }),
        supabase
          .from("generations")
          .select("id, model, status, created_at")
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id ?? "")
          .eq("kind", "narration_audio")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("bible_entries")
          .select("id, version, status, content")
          .eq("workspace_id", workspaceId)
          .eq("kind", "voice")
          .eq("slug", "halmeoni-voice")
          .eq("status", "approved")
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: null }];
  const latestAssetBySegment = new Map<
    string,
    NonNullable<typeof assetsResult.data>[number]
  >();
  for (const asset of assetsResult.data ?? []) {
    if (
      asset.script_segment_id &&
      !latestAssetBySegment.has(asset.script_segment_id)
    )
      latestAssetBySegment.set(asset.script_segment_id, asset);
  }
  const signedUrls = new Map<string, string>();
  await Promise.all(
    [...latestAssetBySegment.values()].map(async (asset) => {
      const { data } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);
      if (data?.signedUrl) signedUrls.set(asset.id, data.signedUrl);
    }),
  );
  const configured = Boolean(getServerEnv().OPENAI_API_KEY);
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;

  return (
    <StudioShell active="Stories" email={email} workspaceName={workspaceName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          href={`/stories/${idea.id}/scenes`}
        >
          ← Scene Plan으로 돌아가기
        </Link>
        <Link
          className="text-sm font-medium text-[var(--rust)] hover:underline"
          href="/visual-bible"
        >
          Halmeoni Voice Bible 설정 →
        </Link>
      </div>
      <div className="mt-6">
        <p className="text-sm font-medium text-[var(--rust)]">
          {idea.category_presets?.name ?? "AUDIO STUDIO"}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
          Halmeoni Narration
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          승인된 대본을 고정된 Halmeoni Voice Bible로 구간별 생성합니다. 마음에
          드는 음성만 승인하면 이후 영상 조립에서 사용됩니다.
        </p>
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
      {!script ? (
        <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
          먼저 Script Studio에서 대본을 승인해 주세요.
        </p>
      ) : null}
      {!voiceResult.data ? (
        <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
          승인된 Halmeoni Voice Bible이 필요합니다.
        </p>
      ) : null}
      {!configured ? (
        <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
          음성을 생성하려면 서버 환경변수 <code>OPENAI_API_KEY</code>가
          필요합니다.
        </p>
      ) : null}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Script", script ? `Approved v${script.version}` : "Not ready"],
          [
            "Voice Bible",
            voiceResult.data
              ? `Approved v${voiceResult.data.version}`
              : "Not ready",
          ],
          [
            "Narration",
            `${latestAssetBySegment.size}/${segmentsResult.data?.length ?? 0} segments`,
          ],
        ].map(([label, value]) => (
          <div
            className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4"
            key={label}
          >
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <div className="mt-8 space-y-4">
        {(segmentsResult.data ?? []).map((segment) => {
          const asset = latestAssetBySegment.get(segment.id);
          const url = asset ? signedUrls.get(asset.id) : null;
          return (
            <article
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              key={segment.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--rust)]">
                    NARRATION {String(segment.position + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {segment.emotion ?? "restrained"} · 약{" "}
                    {Math.round((segment.estimated_duration_ms ?? 0) / 1000)}초
                    · {segment.narration.length.toLocaleString()}자
                  </p>
                </div>
                <form action={generateNarrationAudioAction}>
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <button
                    className="rounded-full bg-[var(--pine)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-45"
                    disabled={
                      !configured ||
                      !voiceResult.data ||
                      segment.narration.length > 4096
                    }
                    name="scriptSegmentId"
                    value={segment.id}
                  >
                    {asset ? "다시 생성" : "음성 생성"}
                  </button>
                </form>
              </div>
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-[var(--muted)]">
                {segment.narration}
              </p>
              {url && asset ? (
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-white p-3 sm:flex-row sm:items-center">
                  <audio
                    className="w-full"
                    controls
                    preload="metadata"
                    src={url}
                  >
                    오디오 재생을 지원하지 않는 브라우저입니다.
                  </audio>
                  {asset.status === "draft" ? (
                    <form action={approveNarrationAudioAction}>
                      <input name="ideaId" type="hidden" value={idea.id} />
                      <button
                        className="rounded-full border border-[var(--pine)] px-4 py-2 text-xs font-semibold whitespace-nowrap text-[var(--pine)]"
                        name="assetId"
                        value={asset.id}
                      >
                        승인·잠금
                      </button>
                    </form>
                  ) : (
                    <span className="rounded-full bg-[#eef7ec] px-3 py-1.5 text-xs whitespace-nowrap text-[#31572d]">
                      Approved
                    </span>
                  )}
                </div>
              ) : null}
              {segment.narration.length > 4096 ? (
                <p className="mt-3 text-xs text-[#9a3f2d]">
                  4,096자를 초과해 생성할 수 없습니다. 다음 대본 버전에서 이
                  구간을 분할하세요.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      <section className="mt-10 rounded-2xl border border-[var(--line)] bg-white/60 p-5">
        <h2 className="font-semibold">AI generation history</h2>
        <div className="mt-3 space-y-2">
          {(generationsResult.data ?? []).map((generation) => (
            <div className="flex justify-between text-xs" key={generation.id}>
              <span>{generation.model}</span>
              <span className="text-[var(--muted)]">{generation.status}</span>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
        공개 영상과 설명에는 시청자가 듣는 음성이 AI로 생성되었다는 사실을
        명확히 표시해야 합니다.
      </p>
    </StudioShell>
  );
}
