import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveNarrationAudioAction,
  generateNarrationAudioAction,
} from "./actions";
import {
  approveAudioLayerAction,
  approveSoundAssetAction,
  createAudioLayerAction,
  uploadSoundAssetAction,
} from "./layer-actions";
import { StudioShell } from "@/components/studio-shell";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

export const maxDuration = 300;

function metadataText(value: Json, key: string) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const item = value[key];
    return typeof item === "string" ? item : null;
  }
  return null;
}

function ruleText(value: Json | undefined, key: string) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const item = value[key];
    return typeof item === "string" || typeof item === "number"
      ? String(item)
      : "";
  }
  return "";
}

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
    .select("id, title, episode_id, category_presets(name, slug, audio_rules)")
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
  const [soundResult, layersResult, scenesResult] = idea.episode_id
    ? await Promise.all([
        supabase
          .from("assets")
          .select(
            "id, storage_bucket, storage_path, status, bytes, metadata, created_at",
          )
          .eq("workspace_id", workspaceId)
          .eq("kind", "audio")
          .contains("metadata", { purpose: "sound_library" })
          .order("created_at", { ascending: false }),
        supabase
          .from("audio_layers")
          .select(
            "id, asset_id, scene_id, layer_type, label, start_ms, end_ms, volume_db, fade_in_ms, fade_out_ms, loop, notes, status, assets(metadata)",
          )
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .order("start_ms"),
        supabase
          .from("scenes")
          .select("id, position, title, scene_plan_versions!inner(episode_id)")
          .eq("workspace_id", workspaceId)
          .eq("scene_plan_versions.episode_id", idea.episode_id)
          .eq("scene_plan_versions.script_version_id", script?.id ?? "")
          .order("position"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
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
  const soundUrls = new Map<string, string>();
  await Promise.all(
    (soundResult.data ?? []).map(async (asset) => {
      const { data } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);
      if (data?.signedUrl) soundUrls.set(asset.id, data.signedUrl);
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

      <section className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className="text-xs font-semibold tracking-wide text-[var(--rust)]">
          CATEGORY AUDIO PRESET
        </p>
        <h2 className="mt-1 text-xl font-semibold">
          {idea.category_presets?.name} 추천 사운드
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {["bgm", "ambience", "sfx"].map((key) => (
            <div className="rounded-xl bg-white p-4" key={key}>
              <p className="text-xs font-semibold text-[var(--rust)] uppercase">
                {key}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {ruleText(idea.category_presets?.audio_rules, key) ||
                  "프리셋을 설정해 주세요."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="sound-library-title">
        <h2 id="sound-library-title" className="text-2xl font-semibold">
          Sound Library
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          직접 소유했거나 사용 허가를 확인한 음원만 등록하세요. 승인된 음원만
          Timeline Layer로 사용할 수 있습니다.
        </p>
        <form
          action={uploadSoundAssetAction}
          className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 md:grid-cols-2"
          encType="multipart/form-data"
        >
          <input name="ideaId" type="hidden" value={idea.id} />
          <label className="text-xs font-medium">
            음원 파일 (MP3·WAV, 최대 25MB)
            <input
              accept="audio/mpeg,audio/wav"
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              name="soundFile"
              required
              type="file"
            />
          </label>
          <label className="text-xs font-medium">
            이름
            <input
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              maxLength={120}
              name="title"
              placeholder="Steady Hanok Rain"
              required
            />
          </label>
          <label className="text-xs font-medium">
            사용 권리
            <select
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              name="rights"
            >
              <option value="owned">직접 제작·소유</option>
              <option value="licensed">라이선스 구매</option>
              <option value="public_domain">Public domain</option>
              <option value="cc0">CC0</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            출처 URL
            <input
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              name="sourceUrl"
              placeholder="https://..."
              type="url"
            />
          </label>
          <label className="text-xs font-medium md:col-span-2">
            라이선스·저작자 표기
            <input
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              maxLength={500}
              name="attribution"
              placeholder="구매처, 라이선스 번호 또는 필요한 크레딧"
            />
          </label>
          <button
            className="justify-self-start rounded-full bg-[var(--rust)] px-5 py-2.5 text-sm font-semibold text-white"
            type="submit"
          >
            Sound Library에 등록
          </button>
        </form>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(soundResult.data ?? []).map((asset) => (
            <article
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4"
              key={asset.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {metadataText(asset.metadata, "title") ?? "Sound Asset"}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {metadataText(asset.metadata, "rights")} · {asset.status} ·{" "}
                    {asset.bytes
                      ? `${Math.round(asset.bytes / 1024 / 1024)}MB`
                      : "audio"}
                  </p>
                </div>
                {asset.status === "draft" ? (
                  <form action={approveSoundAssetAction}>
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <button
                      className="rounded-full border border-[var(--pine)] px-3 py-1.5 text-xs font-semibold text-[var(--pine)]"
                      name="assetId"
                      value={asset.id}
                    >
                      승인·잠금
                    </button>
                  </form>
                ) : null}
              </div>
              {soundUrls.get(asset.id) ? (
                <audio
                  className="mt-3 w-full"
                  controls
                  preload="metadata"
                  src={soundUrls.get(asset.id)}
                >
                  오디오 재생을 지원하지 않는 브라우저입니다.
                </audio>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="layer-title">
        <h2 id="layer-title" className="text-2xl font-semibold">
          Audio Timeline Layers
        </h2>
        <form
          action={createAudioLayerAction}
          className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 md:grid-cols-3"
        >
          <input name="ideaId" type="hidden" value={idea.id} />
          <label className="text-xs font-medium md:col-span-2">
            승인된 Sound Asset
            <select
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              name="assetId"
              required
            >
              <option value="">선택</option>
              {(soundResult.data ?? [])
                .filter((asset) => asset.status === "approved")
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {metadataText(asset.metadata, "title") ?? asset.id}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Layer
            <select
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              name="layerType"
            >
              <option value="bgm">BGM</option>
              <option value="ambience">Ambience</option>
              <option value="sfx">SFX</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            표시 이름
            <input
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              maxLength={120}
              name="label"
              required
            />
          </label>
          <label className="text-xs font-medium">
            Scene (선택)
            <select
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              name="sceneId"
            >
              <option value="">전체 Timeline</option>
              {(scenesResult.data ?? []).map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.position + 1}. {scene.title ?? "Untitled"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Volume dB
            <input
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              defaultValue={-24}
              max={6}
              min={-60}
              name="volumeDb"
              required
              step="0.5"
              type="number"
            />
          </label>
          {[
            ["startSeconds", "시작(초)", 0],
            ["endSeconds", "종료(초, 선택)", ""],
            ["fadeInSeconds", "Fade in(초)", 1],
            ["fadeOutSeconds", "Fade out(초)", 1],
          ].map(([name, label, value]) => (
            <label className="text-xs font-medium" key={name}>
              {label}
              <input
                className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                defaultValue={value}
                min={0}
                name={String(name)}
                step="0.1"
                type="number"
              />
            </label>
          ))}
          <label className="flex items-center gap-2 self-end py-3 text-sm">
            <input name="loop" type="checkbox" /> 반복 재생
          </label>
          <label className="text-xs font-medium md:col-span-3">
            메모
            <input
              className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              maxLength={1000}
              name="notes"
            />
          </label>
          <button
            className="justify-self-start rounded-full bg-[var(--pine)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
            disabled={
              !(soundResult.data ?? []).some(
                (asset) => asset.status === "approved",
              )
            }
            type="submit"
          >
            Timeline에 추가
          </button>
        </form>
        <div className="mt-5 space-y-3">
          {(layersResult.data ?? []).map((layer) => (
            <article
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-white px-4 py-3"
              key={layer.id}
            >
              <div>
                <p className="text-xs font-semibold text-[var(--rust)] uppercase">
                  {layer.layer_type} · {layer.status}
                </p>
                <h3 className="mt-1 font-semibold">{layer.label}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {(layer.start_ms / 1000).toFixed(1)}s–
                  {layer.end_ms
                    ? `${(layer.end_ms / 1000).toFixed(1)}s`
                    : "end"}
                  {" · "}
                  {layer.volume_db}dB · fade {layer.fade_in_ms / 1000}/
                  {layer.fade_out_ms / 1000}s {layer.loop ? "· loop" : ""}
                </p>
              </div>
              {layer.status === "draft" ? (
                <form action={approveAudioLayerAction}>
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <button
                    className="rounded-full border border-[var(--pine)] px-3 py-1.5 text-xs font-semibold text-[var(--pine)]"
                    name="layerId"
                    value={layer.id}
                  >
                    Layer 승인·잠금
                  </button>
                </form>
              ) : (
                <span className="rounded-full bg-[#eef7ec] px-3 py-1.5 text-xs text-[#31572d]">
                  Approved
                </span>
              )}
            </article>
          ))}
        </div>
      </section>

      <h2 className="mt-12 text-2xl font-semibold">Narration Segments</h2>
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
