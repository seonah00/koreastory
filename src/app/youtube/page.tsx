import Link from "next/link";

import { recordYouTubeMetricAction } from "./actions";
import { StudioShell } from "@/components/studio-shell";
import {
  categoryRecommendation,
  weightedAverage,
} from "@/domain/youtube-analytics";
import { requireWorkspace } from "@/server/workspace";

const number = new Intl.NumberFormat("ko-KR");
const percent = (value: number) => `${value.toFixed(1)}%`;
const kstInputValue = () =>
  new Date(Date.now() + 9 * 60 * 60 * 1_000).toISOString().slice(0, 16);

export default async function YouTubeAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, context] = await Promise.all([
    searchParams,
    requireWorkspace(),
  ]);
  const { supabase, workspaceId, workspaceName, email } = context;
  const [{ data: publications }, { data: snapshots }] = await Promise.all([
    supabase
      .from("youtube_publications")
      .select(
        "id, episode_id, video_id, video_url, published_at, episodes(working_title, category_presets(name, slug))",
      )
      .eq("workspace_id", workspaceId)
      .order("published_at", { ascending: false }),
    supabase
      .from("youtube_metric_snapshots")
      .select(
        "id, publication_id, captured_at, views, impressions, click_through_rate, average_view_duration_seconds, average_percentage_viewed, likes, comments, subscribers_gained",
      )
      .eq("workspace_id", workspaceId)
      .order("captured_at", { ascending: false }),
  ]);
  const latestByPublication = new Map<
    string,
    NonNullable<typeof snapshots>[number]
  >();
  for (const snapshot of snapshots ?? []) {
    if (!latestByPublication.has(snapshot.publication_id))
      latestByPublication.set(snapshot.publication_id, snapshot);
  }

  const categoryRows = new Map<
    string,
    Array<{
      views: number;
      impressions: number;
      ctr: number;
      retention: number;
      subscribers: number;
    }>
  >();
  for (const publication of publications ?? []) {
    const metric = latestByPublication.get(publication.id);
    if (!metric) continue;
    const category = publication.episodes?.category_presets?.name ?? "미분류";
    const rows = categoryRows.get(category) ?? [];
    rows.push({
      views: metric.views,
      impressions: metric.impressions,
      ctr: Number(metric.click_through_rate),
      retention: Number(metric.average_percentage_viewed),
      subscribers: metric.subscribers_gained,
    });
    categoryRows.set(category, rows);
  }
  const categories = [...categoryRows.entries()]
    .map(([name, rows]) => {
      const views = rows.reduce((sum, row) => sum + row.views, 0);
    const subscribers = rows.reduce((sum, row) => sum + row.subscribers, 0);
      const ctr = weightedAverage(
        rows.map((row) => ({ value: row.ctr, weight: row.impressions })),
      );
      const retention = weightedAverage(
        rows.map((row) => ({ value: row.retention, weight: row.views })),
      );
      const subscribersPerThousandViews = views
        ? (subscribers / views) * 1_000
        : 0;
      return { name, views, ctr, retention, subscribersPerThousandViews };
    })
    .sort((a, b) => b.views - a.views);
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;

  return (
    <StudioShell active="YouTube" email={email} workspaceName={workspaceName}>
      <p className="text-sm font-medium text-[var(--rust)]">
        YOUTUBE ANALYTICS
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
        게시 성과
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        YouTube Studio의 누적 수치를 시점별로 저장하고, 최신 스냅샷을 기준으로
        카테고리별 성과를 비교합니다.
      </p>
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

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {categories.length ? (
          categories.map((category) => (
            <article
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              key={category.name}
            >
              <h2 className="text-lg font-semibold">{category.name}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[var(--muted)]">조회수</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {number.format(category.views)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">CTR</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {percent(category.ctr)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">평균 시청률</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {percent(category.retention)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">구독/1천 뷰</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {category.subscribersPerThousandViews.toFixed(1)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-[var(--muted)]">
                {categoryRecommendation({
                  clickThroughRate: category.ctr,
                  averagePercentageViewed: category.retention,
                  subscribersPerThousandViews:
                    category.subscribersPerThousandViews,
                })}
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)] lg:col-span-3">
            게시 영상의 첫 성과 스냅샷을 입력하면 카테고리 비교가 시작됩니다.
          </p>
        )}
      </section>

      <section className="mt-10 space-y-5">
        <div>
          <p className="text-sm text-[var(--muted)]">Published Episodes</p>
          <h2 className="mt-1 text-2xl font-semibold">영상별 최신 성과</h2>
        </div>
        {(publications ?? []).map((publication) => {
          const metric = latestByPublication.get(publication.id);
          return (
            <article
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              key={publication.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--rust)]">
                    {publication.episodes?.category_presets?.name ?? "미분류"}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">
                    {publication.episodes?.working_title}
                  </h3>
                  <a
                    className="mt-2 inline-block text-sm text-[var(--pine)] underline"
                    href={publication.video_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    YouTube에서 보기 ↗
                  </a>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  게시{" "}
                  {new Date(publication.published_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>
              </div>
              {metric ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    ["조회수", number.format(metric.views)],
                    ["노출", number.format(metric.impressions)],
                    ["CTR", percent(Number(metric.click_through_rate))],
                    [
                      "평균 시청",
                      `${Math.floor(metric.average_view_duration_seconds / 60)}:${String(metric.average_view_duration_seconds % 60).padStart(2, "0")}`,
                    ],
                    [
                      "평균 시청률",
                      percent(Number(metric.average_percentage_viewed)),
                    ],
                    [
                      "구독 증가",
                      `+${number.format(metric.subscribers_gained)}`,
                    ],
                  ].map(([label, value]) => (
                    <div className="rounded-xl bg-white p-3" key={label}>
                      <p className="text-xs text-[var(--muted)]">{label}</p>
                      <p className="mt-1 font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <details className="mt-5 rounded-xl bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  {metric ? "새 성과 스냅샷 입력" : "첫 성과 스냅샷 입력"}
                </summary>
                <form
                  action={recordYouTubeMetricAction}
                  className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                >
                  <input
                    name="publicationId"
                    type="hidden"
                    value={publication.id}
                  />
                  <label className="text-xs text-[var(--muted)]">
                    측정 시각(KST)
                    <input
                      className="auth-input mt-1"
                      defaultValue={kstInputValue()}
                      name="capturedAt"
                      required
                      type="datetime-local"
                    />
                  </label>
                  {[
                    ["views", "조회수", "1"],
                    ["impressions", "노출수", "1"],
                    ["clickThroughRate", "CTR (%)", "0.1"],
                    ["averageViewDurationSeconds", "평균 시청(초)", "1"],
                    ["averagePercentageViewed", "평균 시청률 (%)", "0.1"],
                    ["likes", "좋아요", "1"],
                    ["comments", "댓글", "1"],
                    ["subscribersGained", "구독 증가", "1"],
                  ].map(([name, label, step]) => (
                    <label className="text-xs text-[var(--muted)]" key={name}>
                      {label}
                      <input
                        className="auth-input mt-1"
                        min="0"
                        name={name}
                        required
                        step={step}
                        type="number"
                      />
                    </label>
                  ))}
                  <button
                    className="self-end rounded-full bg-[var(--pine)] px-4 py-3 text-sm font-semibold text-white"
                    type="submit"
                  >
                    스냅샷 저장
                  </button>
                </form>
              </details>
            </article>
          );
        })}
        {!publications?.length ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
            승인된 게시 패키지 화면에서 YouTube URL과 게시 시각을 먼저 기록해
            주세요.
          </p>
        ) : null}
      </section>
      <Link
        className="mt-8 inline-block text-sm text-[var(--pine)] underline"
        href="/discover#saved-ideas"
      >
        Stories로 이동
      </Link>
    </StudioShell>
  );
}
