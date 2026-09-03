import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import {
  approveScenePlanAction,
  generateScenePlanAction,
  saveScenePlanVersionAction,
} from "./actions";
import { generateSceneImageAction } from "./image-actions";
import { StudioShell } from "@/components/studio-shell";
import { cameraMotionSchema } from "@/domain/scene-plan";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

export const maxDuration = 300;

function mappedPositions(metadata: Json) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const positions = metadata.scriptSegmentPositions;
    if (
      Array.isArray(positions) &&
      positions.every((value) => typeof value === "number")
    ) {
      return positions.join(",");
    }
  }
  return "";
}

export default async function ScenesPage({
  params,
  searchParams,
}: {
  params: Promise<{ ideaId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ ideaId }, query] = await Promise.all([params, searchParams]);
  const { supabase, workspaceId, workspaceName, email } =
    await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("id, title, episode_id, category_presets(name)")
    .eq("workspace_id", workspaceId)
    .eq("id", ideaId)
    .maybeSingle();
  if (!idea) notFound();

  const [scriptResult, versionsResult, generationsResult] = await Promise.all([
    idea.episode_id
      ? supabase
          .from("script_versions")
          .select("id, version, title")
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .eq("status", "approved")
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    idea.episode_id
      ? supabase
          .from("scene_plan_versions")
          .select("id, version, status, script_version_id, created_at")
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [] }),
    idea.episode_id
      ? supabase
          .from("generations")
          .select("id, model, status, created_at")
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .eq("kind", "scene_plan")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);
  const approvedScript = scriptResult.data;
  const versions = versionsResult.data ?? [];
  const latest = versions[0] ?? null;
  const [scenesResult, assetsResult] = latest
    ? await Promise.all([
        supabase
          .from("scenes")
          .select(
            "id, position, title, description, visual_prompt, negative_prompt, camera_motion, ambience, duration_ms, metadata",
          )
          .eq("workspace_id", workspaceId)
          .eq("scene_plan_version_id", latest.id)
          .order("position"),
        supabase
          .from("assets")
          .select(
            "id, scene_id, storage_bucket, storage_path, status, created_at",
          )
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id ?? "")
          .eq("kind", "image")
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const scenes = scenesResult.data ?? [];
  const latestAssetByScene = new Map<
    string,
    NonNullable<typeof assetsResult.data>[number]
  >();
  for (const asset of assetsResult.data ?? []) {
    if (asset.scene_id && !latestAssetByScene.has(asset.scene_id))
      latestAssetByScene.set(asset.scene_id, asset);
  }
  const signedUrls = new Map<string, string>();
  await Promise.all(
    [...latestAssetByScene.values()].map(async (asset) => {
      const { data } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);
      if (data?.signedUrl) signedUrls.set(asset.id, data.signedUrl);
    }),
  );
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;
  const configured = Boolean(getServerEnv().OPENAI_API_KEY);
  const totalMinutes = Math.round(
    (scenes ?? []).reduce((sum, scene) => sum + (scene.duration_ms ?? 0), 0) /
      60000,
  );

  return (
    <StudioShell active="Stories" email={email} workspaceName={workspaceName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          href={`/stories/${idea.id}/script`}
        >
          ← Script Studio로 돌아가기
        </Link>
        <Link
          className="text-sm font-medium text-[var(--rust)] hover:underline"
          href="/visual-bible"
        >
          Visual Bible 설정 →
        </Link>
        <Link
          className="text-sm font-medium text-[var(--pine)] hover:underline"
          href={`/stories/${idea.id}/audio`}
        >
          Narration Audio →
        </Link>
      </div>
      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-medium text-[var(--rust)]">
            {idea.category_presets?.name ?? "SCENE PLANNER"}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
            Scene Plan
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            승인된 영어 대본을 저자극 이미지 장면으로 구성합니다. 모든 대본
            구간이 포함되며 긴 구간은 여러 연속 장면에 연결될 수 있습니다.
          </p>
        </div>
        <form action={generateScenePlanAction}>
          <input name="ideaId" type="hidden" value={idea.id} />
          <button
            className="rounded-full bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!approvedScript || !configured}
            type="submit"
          >
            {latest ? "AI 새 Scene Plan" : "AI Scene Plan 생성"}
          </button>
        </form>
      </div>

      {!approvedScript ? (
        <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
          먼저 Script Studio에서 사용할 대본 버전을 승인해 주세요.
        </p>
      ) : null}
      {!configured ? (
        <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
          AI Scene Plan을 생성하려면 서버 환경변수 <code>OPENAI_API_KEY</code>가
          필요합니다.
        </p>
      ) : null}
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

      {latest && scenes.length ? (
        <>
          <section className="mt-9 grid gap-4 sm:grid-cols-4">
            {[
              ["Plan version", `v${latest.version}`],
              ["Status", latest.status],
              ["Scenes", String(scenes.length)],
              ["Timeline", `≈ ${totalMinutes} min`],
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

          <form action={saveScenePlanVersionAction} className="mt-8">
            <input name="ideaId" type="hidden" value={idea.id} />
            <input
              name="scriptVersionId"
              type="hidden"
              value={latest.script_version_id}
            />
            <input name="sceneCount" type="hidden" value={scenes.length} />
            <div className="space-y-5">
              {scenes.map((scene, index) => {
                const asset = latestAssetByScene.get(scene.id);
                const signedUrl = asset ? signedUrls.get(asset.id) : null;
                return (
                  <article
                    className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6"
                    key={scene.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold tracking-wide text-[var(--rust)]">
                        SCENE {String(index + 1).padStart(2, "0")}
                      </p>
                      <span className="text-xs text-[var(--muted)]">
                        Script segments {mappedPositions(scene.metadata)}
                      </span>
                    </div>
                    <input
                      name={`scriptSegmentPositions-${index}`}
                      type="hidden"
                      value={mappedPositions(scene.metadata)}
                    />
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white lg:col-span-2">
                        {signedUrl ? (
                          <Image
                            alt={`${scene.title ?? `Scene ${index + 1}`} generated illustration`}
                            className="aspect-video w-full object-cover"
                            height={1024}
                            src={signedUrl}
                            unoptimized
                            width={1536}
                          />
                        ) : (
                          <div className="grid aspect-video place-items-center text-sm text-[var(--muted)]">
                            아직 생성된 이미지가 없습니다.
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3">
                          <span className="text-xs text-[var(--muted)]">
                            {asset
                              ? `${asset.status} · 최근 생성본`
                              : "승인된 Scene Plan에서 생성 가능"}
                          </span>
                          <button
                            className="rounded-full bg-[var(--pine)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                            disabled={
                              latest.status !== "approved" || !configured
                            }
                            formAction={generateSceneImageAction}
                            name="sceneId"
                            value={scene.id}
                          >
                            {asset ? "이미지 다시 생성" : "이미지 생성"}
                          </button>
                        </div>
                      </div>
                      <label className="text-xs font-medium text-[var(--muted)]">
                        Title
                        <input
                          className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
                          defaultValue={scene.title ?? ""}
                          maxLength={120}
                          name={`title-${index}`}
                          required
                        />
                      </label>
                      <label className="text-xs font-medium text-[var(--muted)]">
                        Ambience
                        <input
                          className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
                          defaultValue={scene.ambience ?? ""}
                          maxLength={300}
                          name={`ambience-${index}`}
                          required
                        />
                      </label>
                      <label className="text-xs font-medium text-[var(--muted)] lg:col-span-2">
                        Visual description
                        <textarea
                          className="mt-2 block min-h-24 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--ink)]"
                          defaultValue={scene.description}
                          maxLength={1200}
                          name={`description-${index}`}
                          required
                        />
                      </label>
                      <label className="text-xs font-medium text-[var(--muted)] lg:col-span-2">
                        Image prompt
                        <textarea
                          className="mt-2 block min-h-28 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--ink)]"
                          defaultValue={scene.visual_prompt ?? ""}
                          maxLength={2400}
                          name={`visualPrompt-${index}`}
                          required
                        />
                      </label>
                      <label className="text-xs font-medium text-[var(--muted)]">
                        Negative prompt
                        <input
                          className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
                          defaultValue={scene.negative_prompt ?? ""}
                          maxLength={600}
                          name={`negativePrompt-${index}`}
                          required
                        />
                      </label>
                      <label className="text-xs font-medium text-[var(--muted)]">
                        Camera motion
                        <select
                          className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
                          defaultValue={scene.camera_motion ?? "static"}
                          name={`cameraMotion-${index}`}
                        >
                          {cameraMotionSchema.options.map((motion) => (
                            <option key={motion} value={motion}>
                              {motion}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-medium text-[var(--muted)]">
                        Duration (seconds)
                        <input
                          className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
                          defaultValue={Math.round(
                            (scene.duration_ms ?? 10000) / 1000,
                          )}
                          max={600}
                          min={10}
                          name={`durationSeconds-${index}`}
                          required
                          type="number"
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
              <p className="text-sm text-[var(--muted)]">
                저장하면 v{latest.version + 1}이 생성되며 현재 버전은 그대로
                보존됩니다.
              </p>
              <div className="flex gap-3">
                {latest.status === "draft" ? (
                  <button
                    className="rounded-full bg-[var(--rust)] px-5 py-2.5 text-sm font-semibold text-white"
                    formAction={approveScenePlanAction}
                    name="scenePlanId"
                    value={latest.id}
                  >
                    현재 버전 승인·잠금
                  </button>
                ) : (
                  <span className="rounded-full bg-[#eef7ec] px-4 py-2.5 text-sm text-[#31572d]">
                    Approved · locked
                  </span>
                )}
                <button
                  className="rounded-full border border-[var(--pine)] px-5 py-2.5 text-sm font-semibold text-[var(--pine)]"
                  type="submit"
                >
                  수정본을 새 버전으로 저장
                </button>
              </div>
            </div>
          </form>

          <section className="mt-10 grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold">Version history</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
                {versions.map((version) => (
                  <div
                    className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 text-sm last:border-0"
                    key={version.id}
                  >
                    <span>Scene Plan v{version.version}</span>
                    <span className="text-[var(--muted)] capitalize">
                      {version.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI generation history</h2>
              <div className="mt-3 space-y-2">
                {(generationsResult.data ?? []).map((generation) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-xs"
                    key={generation.id}
                  >
                    <span>{generation.model}</span>
                    <span
                      className={
                        generation.status === "succeeded"
                          ? "text-[#31572d]"
                          : generation.status === "failed"
                            ? "text-[var(--rust)]"
                            : "text-[var(--muted)]"
                      }
                    >
                      {generation.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="mt-10 rounded-2xl border border-dashed border-[var(--line)] px-6 py-16 text-center">
          <h2 className="text-xl font-semibold">아직 Scene Plan이 없습니다.</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            승인된 대본을 준비한 뒤 AI Scene Plan을 생성하세요.
          </p>
        </section>
      )}
    </StudioShell>
  );
}
