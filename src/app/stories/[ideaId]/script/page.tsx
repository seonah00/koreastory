import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveScriptAction,
  generateScriptAction,
  saveScriptVersionAction,
} from "./actions";
import { StudioShell } from "@/components/studio-shell";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

export const maxDuration = 300;

function segmentType(metadata: Json) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return typeof metadata.segmentType === "string"
      ? metadata.segmentType
      : "story";
  }
  return "story";
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export default async function ScriptPage({
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
    .select("id, title, synopsis, episode_id, category_presets(name)")
    .eq("workspace_id", workspaceId)
    .eq("id", ideaId)
    .maybeSingle();
  if (!idea) notFound();

  const [briefResult, versionsResult, generationsResult] = await Promise.all([
    idea.episode_id
      ? supabase
          .from("story_brief_versions")
          .select("id, version, status, content")
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    idea.episode_id
      ? supabase
          .from("script_versions")
          .select("id, version, status, title, full_text, created_at")
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [] }),
    idea.episode_id
      ? supabase
          .from("generations")
          .select("id, status, model, created_at")
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .eq("kind", "longform_script")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);
  const brief = briefResult.data;
  const versions = versionsResult.data ?? [];
  const latest = versions[0] ?? null;
  const { data: segments } = latest
    ? await supabase
        .from("script_segments")
        .select(
          "id, position, narration, emotion, estimated_duration_ms, metadata",
        )
        .eq("workspace_id", workspaceId)
        .eq("script_version_id", latest.id)
        .order("position")
    : { data: [] };
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;
  const configured = Boolean(getServerEnv().OPENAI_API_KEY);

  return (
    <StudioShell active="Stories" email={email} workspaceName={workspaceName}>
      <Link
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        href={`/stories/${idea.id}/brief`}
      >
        ← Story Brief로 돌아가기
      </Link>
      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-medium text-[var(--rust)]">
            {idea.category_presets?.name ?? "SCRIPT STUDIO"}
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em]">
            English Long-form Script
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            {idea.title}의 Brief와 검증된 근거를 사용합니다. 생성·수정할 때마다
            기존 대본은 보존되고 새 버전이 만들어집니다.
          </p>
        </div>
        <form action={generateScriptAction}>
          <input name="ideaId" type="hidden" value={idea.id} />
          <button
            className="rounded-full bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!brief || !configured}
            type="submit"
          >
            {latest ? "AI 새 버전 생성" : "AI 대본 생성"}
          </button>
        </form>
      </div>

      {!configured ? (
        <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
          실제 대본 생성을 실행하려면 서버 환경변수 <code>OPENAI_API_KEY</code>
          를 설정해야 합니다.
        </p>
      ) : null}
      {!brief ? (
        <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
          대본을 만들기 전에 Story Brief를 생성해 주세요.
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

      {latest ? (
        <>
          <section className="mt-9 grid gap-4 sm:grid-cols-4">
            {[
              ["Current version", `v${latest.version}`],
              ["Status", latest.status],
              [
                "Word count",
                wordCount(latest.full_text).toLocaleString("en-US"),
              ],
              ["Segments", String(segments?.length ?? 0)],
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
          <section className="mt-8 grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
            <form
              action={saveScriptVersionAction}
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6"
            >
              <input name="ideaId" type="hidden" value={idea.id} />
              <label
                className="block text-xs font-medium tracking-wide text-[var(--muted)] uppercase"
                htmlFor="title"
              >
                Title
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-lg font-semibold"
                defaultValue={latest.title ?? idea.title}
                id="title"
                maxLength={180}
                name="title"
                required
              />
              <label
                className="mt-6 block text-xs font-medium tracking-wide text-[var(--muted)] uppercase"
                htmlFor="fullText"
              >
                Full narration
              </label>
              <textarea
                className="mt-2 min-h-[720px] w-full rounded-xl border border-[var(--line)] bg-white px-4 py-4 text-sm leading-7"
                defaultValue={latest.full_text}
                id="fullText"
                maxLength={60000}
                minLength={500}
                name="fullText"
                required
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--muted)]">
                  저장하면 v{latest.version + 1}이 생성되며 현재 버전은
                  유지됩니다.
                </p>
                <button
                  className="rounded-full border border-[var(--pine)] px-5 py-2.5 text-sm font-semibold text-[var(--pine)]"
                  type="submit"
                >
                  수정본을 새 버전으로 저장
                </button>
              </div>
            </form>
            <div className="space-y-7">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Production segments</h2>
                  {latest.status === "draft" ? (
                    <form action={approveScriptAction}>
                      <input name="ideaId" type="hidden" value={idea.id} />
                      <input name="scriptId" type="hidden" value={latest.id} />
                      <button
                        className="rounded-full bg-[var(--rust)] px-4 py-2 text-xs font-semibold text-white"
                        type="submit"
                      >
                        이 버전 승인·잠금
                      </button>
                    </form>
                  ) : (
                    <span className="rounded-full bg-[#eef7ec] px-3 py-1.5 text-xs text-[#31572d]">
                      Approved · locked
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  {(segments ?? []).map((segment) => (
                    <article
                      className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4"
                      key={segment.id}
                    >
                      <div className="flex justify-between gap-3 text-xs text-[var(--muted)]">
                        <span className="uppercase">
                          {segment.position + 1}.{" "}
                          {segmentType(segment.metadata)}
                        </span>
                        <span>
                          {Math.round(
                            (segment.estimated_duration_ms ?? 0) / 1000,
                          )}{" "}
                          sec
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-4 text-sm leading-6">
                        {segment.narration}
                      </p>
                      <p className="mt-2 text-xs text-[var(--rust)]">
                        {segment.emotion}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="text-lg font-semibold">Version history</h2>
                <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
                  {versions.map((version) => (
                    <div
                      className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 text-sm last:border-0"
                      key={version.id}
                    >
                      <span>
                        v{version.version} ·{" "}
                        {wordCount(version.full_text).toLocaleString("en-US")}{" "}
                        words
                      </span>
                      <span className="text-[var(--muted)] capitalize">
                        {version.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              {(generationsResult.data ?? []).length ? (
                <section>
                  <h2 className="text-lg font-semibold">
                    AI generation history
                  </h2>
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
                </section>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-10 rounded-2xl border border-dashed border-[var(--line)] px-6 py-16 text-center">
          <h2 className="text-xl font-semibold">
            아직 생성된 대본이 없습니다.
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Story Brief와 리서치 근거를 확인한 후 AI 대본 생성을 실행하세요.
          </p>
        </section>
      )}
    </StudioShell>
  );
}
