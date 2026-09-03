import Link from "next/link";
import { notFound } from "next/navigation";

import { StudioShell } from "@/components/studio-shell";
import { getStarterIdea, starterIdeas } from "@/domain/discovery";
import { createBriefAction } from "@/app/discover/actions";
import { runResearchAction } from "@/app/stories/[ideaId]/brief/research-action";
import { getServerEnv } from "@/server/env";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

export const maxDuration = 300;

function textValue(content: Json, key: string) {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const value = content[key];
    return typeof value === "string" ? value : "";
  }
  return "";
}

function numberValue(content: Json, key: string) {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const value = content[key];
    return typeof value === "number" ? value : null;
  }
  return null;
}

const categoryDefaults: Record<
  string,
  {
    emotion: string;
    direction: string;
    promise: string;
    mood: string;
    minutes: number;
  }
> = {
  "grandmas-tales": {
    emotion: "Warmth, family, and gentle growth",
    direction:
      "Keep the conflict easy to follow, soften harsh details, and frame the ending as a warm lesson told by Halmeoni.",
    promise:
      "A comforting Korean folktale with a universal emotion and a gentle ending.",
    mood: "Warm · Nostalgic · Storybook",
    minutes: 20,
  },
  "strange-tales": {
    emotion: "Curiosity, unease, and quiet wonder",
    direction:
      "Open with the unexplained event, escalate through three clues, preserve Korean folklore details, and end with a restrained reveal.",
    promise:
      "A mysterious Korean tale whose final reveal rewards viewers who stay to the end.",
    mood: "Moonlit · Mysterious · Restrained",
    minutes: 22,
  },
  "korean-legends": {
    emotion: "Awe, sacrifice, and transformation",
    direction:
      "Explain unfamiliar Korean mythology naturally inside the journey and preserve the mythic scale without turning it into a lecture.",
    promise:
      "A cinematic Korean legend made understandable to a global audience without losing its cultural identity.",
    mood: "Mythic · Emotional · Expansive",
    minutes: 28,
  },
  "stories-for-sleep": {
    emotion: "Safety, calm, and belonging",
    direction:
      "Keep conflict extremely low, expand sensory details and repeated rituals, and use long gentle transitions suitable for sleep.",
    promise:
      "A slow journey through old Korea designed to help the listener settle and fall asleep.",
    mood: "Cozy · Low-stimulation · Ambient",
    minutes: 40,
  },
  "old-korean-wisdom": {
    emotion: "Recognition, regret, and reflection",
    direction:
      "Center one human choice, connect its consequence to modern adult life, and leave space for reflection instead of stating the lesson too directly.",
    promise:
      "An old Korean story that reveals something useful about the choices we make today.",
    mood: "Reflective · Human · Quiet",
    minutes: 18,
  },
};

export default async function StoryBriefPage({
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
    .select(
      "id, title, synopsis, rationale, episode_id, category_presets(name, slug)",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", ideaId)
    .maybeSingle();

  if (!idea) notFound();

  const [briefResult, sourcesResult, evidenceResult, generationsResult] =
    await Promise.all([
      idea.episode_id
        ? supabase
            .from("story_brief_versions")
            .select("id, content, status, version")
            .eq("episode_id", idea.episode_id)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("source_documents")
        .select("id, title, source_url, publisher, retrieved_at")
        .eq("workspace_id", workspaceId)
        .eq("story_idea_id", idea.id)
        .order("retrieved_at", { ascending: false }),
      supabase
        .from("research_evidence")
        .select(
          "id, claim, evidence_excerpt, confidence, source_documents(title, source_url)",
        )
        .eq("workspace_id", workspaceId)
        .eq("story_idea_id", idea.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("generations")
        .select("id, status, model, created_at")
        .eq("workspace_id", workspaceId)
        .eq("kind", "web_research")
        .contains("request", { ideaId: idea.id })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
  const existingBrief = briefResult.data;
  const sources = sourcesResult.data ?? [];
  const evidence = evidenceResult.data ?? [];
  const generations = generationsResult.data ?? [];

  const categorySlug = idea.category_presets?.slug ?? "grandmas-tales";
  const defaults =
    categoryDefaults[categorySlug] ?? categoryDefaults["grandmas-tales"];
  const requestedStarter =
    typeof query.starter === "string"
      ? getStarterIdea(query.starter)
      : undefined;
  const starter =
    requestedStarter ?? starterIdeas.find((item) => item.title === idea.title);
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;
  const researchMessage =
    typeof query.research === "string" ? query.research : null;
  const researchError =
    typeof query.researchError === "string" ? query.researchError : null;
  const researchConfigured = Boolean(getServerEnv().OPENAI_API_KEY);

  return (
    <StudioShell active="Stories" email={email} workspaceName={workspaceName}>
      <Link
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        href="/discover"
      >
        ← 소재 목록으로
      </Link>
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-[var(--rust)]">
            {idea.category_presets?.name ?? "STORY BRIEF"}
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em]">
            {idea.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            {idea.synopsis}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-xs font-medium text-[var(--muted)]">
          {existingBrief
            ? `Brief v${existingBrief.version} · ${existingBrief.status}`
            : "Brief 준비 중"}
        </span>
      </div>

      {saved ? (
        <p
          className="mt-6 rounded-xl border border-[#b9d1b7] bg-[#eef7ec] px-4 py-3 text-sm text-[#31572d]"
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

      {existingBrief ? (
        <section className="mt-9 grid gap-4 md:grid-cols-2">
          {[
            ["Global Hook", textValue(existingBrief.content, "globalHook")],
            ["Core Emotion", textValue(existingBrief.content, "coreEmotion")],
            [
              "Adaptation Direction",
              textValue(existingBrief.content, "adaptationDirection"),
            ],
            [
              "Audience Promise",
              textValue(existingBrief.content, "audiencePromise"),
            ],
            ["Mood", textValue(existingBrief.content, "mood")],
            [
              "Target Duration",
              `${numberValue(existingBrief.content, "targetDurationMinutes") ?? "—"} minutes`,
            ],
          ].map(([label, value]) => (
            <article
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              key={label}
            >
              <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                {label}
              </p>
              <p className="mt-3 text-sm leading-6">{value}</p>
            </article>
          ))}
        </section>
      ) : (
        <form
          action={createBriefAction}
          className="mt-9 grid gap-6 rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 sm:p-8"
        >
          <input name="ideaId" type="hidden" value={idea.id} />
          <div className="grid gap-6 md:grid-cols-2">
            <label className="studio-field studio-field-light">
              <span>Global Hook</span>
              <textarea
                defaultValue={
                  starter?.hook ??
                  `An old Korean story about ${idea.title.toLowerCase()}—and the choice that changed everything.`
                }
                maxLength={500}
                minLength={10}
                name="globalHook"
                required
                rows={4}
              />
            </label>
            <label className="studio-field studio-field-light">
              <span>Core Emotion</span>
              <input
                defaultValue={defaults.emotion}
                maxLength={160}
                minLength={3}
                name="coreEmotion"
                required
              />
            </label>
          </div>
          <label className="studio-field studio-field-light">
            <span>K-Lore 각색 방향</span>
            <textarea
              defaultValue={defaults.direction}
              maxLength={1200}
              minLength={10}
              name="adaptationDirection"
              required
              rows={5}
            />
          </label>
          <label className="studio-field studio-field-light">
            <span>시청자에게 줄 약속</span>
            <textarea
              defaultValue={defaults.promise}
              maxLength={500}
              minLength={10}
              name="audiencePromise"
              required
              rows={3}
            />
          </label>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="studio-field studio-field-light">
              <span>Mood</span>
              <input
                defaultValue={starter?.mood ?? defaults.mood}
                maxLength={160}
                minLength={3}
                name="mood"
                required
              />
            </label>
            <label className="studio-field studio-field-light">
              <span>목표 영상 길이</span>
              <select
                defaultValue={defaults.minutes}
                name="targetDurationMinutes"
              >
                <option value="15">15분</option>
                <option value="20">20분</option>
                <option value="24">24분</option>
                <option value="30">30분</option>
                <option value="40">40분</option>
                <option value="60">60분</option>
              </select>
            </label>
          </div>
          <div className="flex flex-col justify-between gap-4 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center">
            <p className="max-w-xl text-xs leading-5 text-[var(--muted)]">
              Brief를 생성하면 Episode가 함께 만들어지고 제작 단계가 Brief로
              이동합니다.
            </p>
            <button
              className="rounded-full bg-[var(--rust)] px-6 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Story Brief 확정하기
            </button>
          </div>
        </form>
      )}

      <aside className="mt-7 rounded-2xl border border-dashed border-[var(--line)] px-5 py-4 text-sm leading-6 text-[var(--muted)]">
        <strong className="font-medium text-[var(--ink)]">
          Why this could work:
        </strong>{" "}
        {idea.rationale}
      </aside>

      {existingBrief ? (
        <div className="mt-8 flex justify-end">
          <Link
            className="rounded-full bg-[var(--rust)] px-6 py-3 text-sm font-semibold text-white"
            href={`/stories/${idea.id}/script`}
          >
            영어 롱폼 대본 만들기 →
          </Link>
        </div>
      ) : null}

      <section className="mt-12" id="research">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-[var(--rust)]">
              RESEARCH &amp; FACT CHECK
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              출처가 남는 AI 웹 리서치
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              한국 문화기관·박물관·학술 자료를 우선 검색하고, 주장마다 연결된
              출처와 신뢰도를 저장합니다.
            </p>
          </div>
          <form action={runResearchAction}>
            <input name="ideaId" type="hidden" value={idea.id} />
            <button
              className="rounded-full bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!researchConfigured}
              type="submit"
            >
              AI 웹 리서치 실행
            </button>
          </form>
        </div>

        {!researchConfigured ? (
          <p className="mt-5 rounded-xl border border-[#e4c98f] bg-[#fff7df] px-4 py-3 text-sm text-[#735718]">
            실제 검색을 실행하려면 서버 환경변수 <code>OPENAI_API_KEY</code>를
            설정해야 합니다.
          </p>
        ) : null}
        {researchMessage ? (
          <p
            className="mt-5 rounded-xl border border-[#b9d1b7] bg-[#eef7ec] px-4 py-3 text-sm text-[#31572d]"
            role="status"
          >
            {researchMessage}
          </p>
        ) : null}
        {researchError ? (
          <p className="auth-error" role="alert">
            {researchError}
          </p>
        ) : null}

        <div className="mt-7 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h3 className="text-sm font-semibold">
              검증된 핵심 주장{" "}
              <span className="font-normal text-[var(--muted)]">
                {evidence.length}
              </span>
            </h3>
            <div className="mt-3 space-y-3">
              {evidence.length ? (
                evidence.map((item) => (
                  <article
                    className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm leading-6 font-semibold">
                        {item.claim}
                      </p>
                      <span className="rounded-full bg-[var(--canvas)] px-2.5 py-1 text-xs text-[var(--muted)]">
                        {item.confidence !== null
                          ? `${Math.round(item.confidence * 100)}%`
                          : "—"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {item.evidence_excerpt}
                    </p>
                    {item.source_documents?.source_url ? (
                      <a
                        className="mt-3 inline-block text-xs font-medium text-[var(--rust)] hover:underline"
                        href={item.source_documents.source_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {item.source_documents.title} ↗
                      </a>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-10 text-center text-sm text-[var(--muted)]">
                  아직 저장된 근거가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              검색 출처{" "}
              <span className="font-normal text-[var(--muted)]">
                {sources.length}
              </span>
            </h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
              {sources.length ? (
                sources.map((source) => (
                  <a
                    className="block border-b border-[var(--line)] px-4 py-4 last:border-0 hover:bg-white"
                    href={source.source_url ?? "#"}
                    key={source.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="block text-sm leading-5 font-medium">
                      {source.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                      {source.publisher ?? source.source_url}
                    </span>
                  </a>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  리서치를 실행하면 출처가 여기에 쌓입니다.
                </p>
              )}
            </div>

            {generations.length ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">최근 실행 기록</h3>
                <div className="mt-3 space-y-2">
                  {generations.map((generation) => (
                    <div
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-xs"
                      key={generation.id}
                    >
                      <span>{generation.model}</span>
                      <span
                        className={
                          generation.status === "succeeded"
                            ? "text-[#3d6d38]"
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
            ) : null}
          </div>
        </div>
      </section>
    </StudioShell>
  );
}
