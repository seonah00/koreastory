import Link from "next/link";

import { categoryPresets } from "@/domain/category-presets";

const productionStages = [
  { label: "아이디어", count: 18 },
  { label: "리서치", count: 3 },
  { label: "대본", count: 2 },
  { label: "비주얼", count: 1 },
  { label: "렌더", count: 0 },
];

export default function Home() {
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
                K-Lore Content OS
              </p>
              <p className="text-xs text-[var(--muted)]">
                Personal production studio
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--muted)]">
            MVP · Foundation
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav aria-label="스튜디오 메뉴" className="sticky top-8 space-y-1">
            {[
              "Dashboard",
              "Discover",
              "Stories",
              "Visuals",
              "Episodes",
              "Assets",
              "YouTube",
            ].map((item, index) => (
              <span
                className={`block rounded-xl px-4 py-3 text-sm ${
                  index === 0
                    ? "bg-[var(--pine)] font-medium text-white"
                    : "text-[var(--muted)]"
                }`}
                key={item}
              >
                {item}
              </span>
            ))}
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
              href="#categories"
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
                  다음 단계에서 프로젝트, 에피소드, 승인 버전과 안전한 저장
                  구조를 연결합니다.
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--gold)]">
                TASK-002
              </span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
