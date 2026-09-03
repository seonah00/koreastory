import Link from "next/link";
import { redirect } from "next/navigation";

import { categoryPresets } from "@/domain/category-presets";
import { logoutAction } from "@/app/(auth)/actions";
import { createClient } from "@/server/supabase/server";

const stageGroups = [
  { label: "아이디어", stages: ["idea"] },
  { label: "리서치", stages: ["research", "brief"] },
  { label: "대본", stages: ["script", "scenes"] },
  { label: "비주얼", stages: ["visuals", "audio"] },
  { label: "렌더", stages: ["render", "review", "ready"] },
] as const;

export default async function Home() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const workspaceId = membership?.workspace_id;
  const { data: episodes } = workspaceId
    ? await supabase
        .from("episodes")
        .select("stage")
        .eq("workspace_id", workspaceId)
    : { data: [] };

  const productionStages = stageGroups.map((group) => ({
    label: group.label,
    count:
      episodes?.filter((episode) =>
        group.stages.some((stage) => stage === episode.stage),
      ).length ?? 0,
  }));
  const workspaceName = membership?.workspaces?.name ?? "K-Lore Studio";
  const email =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : "Storyteller";

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-[var(--pine)] text-sm font-semibold text-white">
              KL
            </div>
            <div>
              <p className="font-semibold tracking-[-0.02em]">
                {workspaceName}
              </p>
              <p className="text-xs text-[var(--muted)]">
                Personal production studio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--muted)] sm:inline">
              {email}
            </span>
            <form action={logoutAction}>
              <button
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                type="submit"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav aria-label="스튜디오 메뉴" className="sticky top-8 space-y-1">
            {[
              { label: "Dashboard", href: "/" },
              { label: "Discover", href: "/discover" },
              { label: "Stories", href: "/discover#saved-ideas" },
              { label: "Visuals", href: "/visual-bible" },
              { label: "Episodes" },
              { label: "Assets", href: "/assets" },
              { label: "YouTube" },
            ].map((item, index) =>
              typeof item.href === "string" ? (
                <Link
                  className={`block rounded-xl px-4 py-3 text-sm ${index === 0 ? "bg-[var(--pine)] font-medium text-white" : "text-[var(--muted)] hover:bg-white/60"}`}
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="block rounded-xl px-4 py-3 text-sm text-[var(--muted)]/55"
                  key={item.label}
                >
                  {item.label}
                </span>
              ),
            )}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--rust)]">
                오늘 밤, 어떤 이야기를 만들까요?
              </p>
              <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.04em] sm:text-5xl">
                한국의 오래된 이야기를
                <br />
                하나의 영상으로 완성하세요.
              </h1>
            </div>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--rust)] px-6 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              href="/discover"
            >
              새 에피소드 만들기
            </Link>
          </div>

          <section aria-labelledby="production-title" className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="production-title" className="text-lg font-semibold">
                제작 현황
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Idea → Research → Script → Visual → Render
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              {productionStages.map((stage) => (
                <article
                  className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
                  key={stage.label}
                >
                  <p className="text-xs font-medium text-[var(--muted)]">
                    {stage.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">
                    {stage.count}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="categories-title"
            className="mt-12"
            id="categories"
          >
            <div className="mb-5">
              <p className="text-sm text-[var(--muted)]">
                Category Production Presets
              </p>
              <h2
                id="categories-title"
                className="mt-1 text-2xl font-semibold tracking-[-0.03em]"
              >
                카테고리에 맞는 제작 규칙
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categoryPresets.map((category) => (
                <article
                  className="group rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(47,57,45,0.08)]"
                  key={category.key}
                >
                  <div className="mb-8 flex items-start justify-between">
                    <span aria-hidden="true" className="text-3xl">
                      {category.symbol}
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-xs"
                      style={{ backgroundColor: category.tint }}
                    >
                      {category.role}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold">{category.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--muted)]">
                    {category.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {category.signals.map((signal) => (
                      <span
                        className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)]"
                        key={signal}
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-12 rounded-3xl bg-[var(--pine)] px-7 py-8 text-white sm:px-9">
            <p className="text-sm text-white/65">Foundation status</p>
            <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-semibold">
                  제작 기반을 구성하고 있습니다.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  카테고리별 소재 발굴과 Story Brief 제작 흐름이 준비되었습니다.
                  이제 저장한 Brief를 바탕으로 영어 대본을 제작할 수 있습니다.
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--gold)]">
                TASK-005
              </span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
