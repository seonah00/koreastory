import Link from "next/link";

import { StudioShell } from "@/components/studio-shell";
import { categoryPresets } from "@/domain/category-presets";
import { ideasForCategory } from "@/domain/discovery";
import { requireWorkspace } from "@/server/workspace";
import { saveCustomIdeaAction, saveStarterIdeaAction } from "./actions";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const selected =
    typeof params.category === "string" ? params.category : undefined;
  const error = typeof params.error === "string" ? params.error : null;
  const { supabase, workspaceId, workspaceName, email } =
    await requireWorkspace();

  const [{ data: presets }, { data: savedIdeas }] = await Promise.all([
    supabase
      .from("category_presets")
      .select("id, slug, name")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),
    supabase
      .from("story_ideas")
      .select(
        "id, title, synopsis, episode_id, created_at, category_presets(name, slug)",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const presetBySlug = new Map(presets?.map((preset) => [preset.slug, preset]));
  const visibleIdeas = ideasForCategory(selected);

  return (
    <StudioShell active="Discover" email={email} workspaceName={workspaceName}>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--rust)]">DISCOVER</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
            오늘 만들 이야기를 고르세요.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            카테고리를 바꾸면 추천 기준과 Story Brief의 기획 방향도 함께
            바뀝니다.
          </p>
        </div>
        <a
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 text-sm font-semibold"
          href="#custom-idea"
        >
          직접 소재 추가
        </a>
      </div>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <nav
        aria-label="콘텐츠 카테고리"
        className="mt-9 flex gap-2 overflow-x-auto pb-2"
      >
        <Link
          className={`category-tab ${!selected ? "category-tab-active" : ""}`}
          href="/discover"
        >
          전체
        </Link>
        {categoryPresets.map((category) => {
          const slug =
            category.key === "grandma"
              ? "grandmas-tales"
              : category.key === "strange"
                ? "strange-tales"
                : category.key === "legends"
                  ? "korean-legends"
                  : category.key === "sleep"
                    ? "stories-for-sleep"
                    : "old-korean-wisdom";
          return (
            <Link
              className={`category-tab ${selected === slug ? "category-tab-active" : ""}`}
              href={`/discover?category=${slug}`}
              key={category.key}
            >
              {category.symbol} {category.name}
            </Link>
          );
        })}
      </nav>

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        {visibleIdeas.map((idea) => (
          <article
            className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6"
            key={idea.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[var(--rust)]">
                  {presetBySlug.get(idea.category)?.name ?? idea.category}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">
                  {idea.title}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {idea.koreanTitle} · {idea.mood}
                </p>
              </div>
              <span className="rounded-full bg-[var(--canvas)] px-3 py-1 text-xs text-[var(--muted)]">
                {idea.sourceKind}
              </span>
            </div>
            <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
              {idea.synopsis}
            </p>
            <blockquote className="mt-4 border-l-2 border-[var(--rust)] pl-4 text-sm leading-6 italic">
              “{idea.hook}”
            </blockquote>
            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(idea.scores).map(([name, score]) => (
                <span
                  className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)]"
                  key={name}
                >
                  {name} {score}
                </span>
              ))}
            </div>
            <form action={saveStarterIdeaAction} className="mt-6">
              <input name="starterId" type="hidden" value={idea.id} />
              <button
                className="w-full rounded-full bg-[var(--pine)] px-5 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                저장하고 Story Brief 만들기
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className="mt-12" id="saved-ideas">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">IDEA LIBRARY</p>
            <h2 className="mt-1 text-2xl font-semibold">저장한 소재</h2>
          </div>
          <span className="text-sm text-[var(--muted)]">
            {savedIdeas?.length ?? 0}개
          </span>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
          {savedIdeas?.length ? (
            savedIdeas.map((idea) => (
              <Link
                className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 last:border-0 hover:bg-white"
                href={`/stories/${idea.id}/brief`}
                key={idea.id}
              >
                <span>
                  <span className="block text-sm font-semibold">
                    {idea.title}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {idea.category_presets?.name ?? "Uncategorized"}
                  </span>
                </span>
                <span className="text-xs font-medium text-[var(--rust)]">
                  {idea.episode_id ? "Brief 보기" : "Brief 만들기"} →
                </span>
              </Link>
            ))
          ) : (
            <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              아직 저장한 소재가 없습니다.
            </p>
          )}
        </div>
      </section>

      <section
        className="mt-12 rounded-3xl bg-[var(--pine)] p-7 text-white sm:p-9"
        id="custom-idea"
      >
        <p className="text-sm text-[var(--gold)]">ADD YOUR OWN IDEA</p>
        <h2 className="mt-2 text-2xl font-semibold">
          직접 찾은 소재가 있나요?
        </h2>
        <form action={saveCustomIdeaAction} className="mt-6 grid gap-5">
          <label className="studio-field">
            <span>카테고리</span>
            <select name="category" required>
              {presets?.map((preset) => (
                <option key={preset.id} value={preset.slug}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <label className="studio-field">
            <span>영문 작업 제목</span>
            <input
              maxLength={160}
              minLength={3}
              name="title"
              placeholder="The Story of..."
              required
            />
          </label>
          <label className="studio-field">
            <span>원 이야기 요약</span>
            <textarea
              maxLength={1200}
              minLength={10}
              name="synopsis"
              placeholder="누가, 어떤 상황에서, 무엇을 겪는 이야기인지 적어주세요."
              required
              rows={4}
            />
          </label>
          <button
            className="justify-self-start rounded-full bg-[var(--rust)] px-6 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            소재 저장하기
          </button>
        </form>
      </section>
    </StudioShell>
  );
}
