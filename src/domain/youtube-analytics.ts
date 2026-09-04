import { z } from "zod";

const nonNegativeInteger = z.coerce.number().int().nonnegative();
const percentage = z.coerce.number().min(0).max(100);

export const publicationInputSchema = z.object({
  ideaId: z.uuid(),
  publishPackageVersionId: z.uuid(),
  videoUrl: z.url().refine((value) => extractYouTubeVideoId(value) !== null, {
    message: "올바른 YouTube 영상 URL이 필요합니다.",
  }),
  publishedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
});

export const metricSnapshotInputSchema = z.object({
  publicationId: z.uuid(),
  capturedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  views: nonNegativeInteger,
  impressions: nonNegativeInteger,
  clickThroughRate: percentage,
  averageViewDurationSeconds: nonNegativeInteger,
  averagePercentageViewed: percentage,
  likes: nonNegativeInteger,
  comments: nonNegativeInteger,
  subscribersGained: nonNegativeInteger,
});

export type MetricSnapshot = z.infer<typeof metricSnapshotInputSchema>;

export function koreanLocalDateTimeToIso(value: string) {
  return new Date(`${value}:00+09:00`).toISOString();
}

export function extractYouTubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be")
      return /^[\w-]{11}$/.test(url.pathname.slice(1))
        ? url.pathname.slice(1)
        : null;
    if (host !== "youtube.com" && host !== "m.youtube.com") return null;
    const id = url.pathname.startsWith("/shorts/")
      ? url.pathname.split("/")[2]
      : url.searchParams.get("v");
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function weightedAverage(
  rows: Array<{ value: number; weight: number }>,
) {
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  if (!totalWeight) return 0;
  return (
    rows.reduce((sum, row) => sum + row.value * row.weight, 0) / totalWeight
  );
}

export function categoryRecommendation(metrics: {
  clickThroughRate: number;
  averagePercentageViewed: number;
  subscribersPerThousandViews: number;
}) {
  if (metrics.clickThroughRate >= 6 && metrics.averagePercentageViewed >= 40)
    return "유입과 시청 유지가 모두 강합니다. 다음 제작 비중을 늘리세요.";
  if (metrics.clickThroughRate < 4)
    return "제목과 썸네일 후킹을 우선 개선하세요.";
  if (metrics.averagePercentageViewed < 35)
    return "오프닝과 중반 전개를 짧게 재구성하세요.";
  if (metrics.subscribersPerThousandViews >= 5)
    return "구독 전환이 좋습니다. 같은 세계관의 후속편을 만드세요.";
  return "데이터를 더 모으면서 현재 제작 비중을 유지하세요.";
}
