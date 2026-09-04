"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  extractYouTubeVideoId,
  koreanLocalDateTimeToIso,
  metricSnapshotInputSchema,
  publicationInputSchema,
} from "@/domain/youtube-analytics";
import { requireWorkspace } from "@/server/workspace";

const analyticsLocation = (key: "saved" | "error", message: string) =>
  `/youtube?${key}=${encodeURIComponent(message)}`;

export async function recordYouTubePublicationAction(formData: FormData) {
  const parsed = publicationInputSchema.safeParse({
    ideaId: formData.get("ideaId"),
    publishPackageVersionId: formData.get("publishPackageVersionId"),
    videoUrl: formData.get("videoUrl"),
    publishedAt: formData.get("publishedAt"),
  });
  if (!parsed.success)
    redirect(
      analyticsLocation("error", "YouTube URL과 게시 시각을 확인해 주세요."),
    );
  const videoId = extractYouTubeVideoId(parsed.data.videoUrl);
  if (!videoId)
    redirect(analyticsLocation("error", "올바른 YouTube URL이 필요합니다."));

  const { supabase } = await requireWorkspace();
  const { error } = await supabase.rpc("record_youtube_publication", {
    p_publish_package_version_id: parsed.data.publishPackageVersionId,
    p_video_id: videoId,
    p_video_url: `https://www.youtube.com/watch?v=${videoId}`,
    p_published_at: koreanLocalDateTimeToIso(parsed.data.publishedAt),
  });
  if (error)
    redirect(analyticsLocation("error", "게시 정보를 저장하지 못했습니다."));

  revalidatePath("/");
  revalidatePath("/youtube");
  revalidatePath(`/stories/${parsed.data.ideaId}/publish`);
  redirect(analyticsLocation("saved", "YouTube 게시 정보를 기록했습니다."));
}

export async function recordYouTubeMetricAction(formData: FormData) {
  const parsed = metricSnapshotInputSchema.safeParse({
    publicationId: formData.get("publicationId"),
    capturedAt: formData.get("capturedAt"),
    views: formData.get("views"),
    impressions: formData.get("impressions"),
    clickThroughRate: formData.get("clickThroughRate"),
    averageViewDurationSeconds: formData.get("averageViewDurationSeconds"),
    averagePercentageViewed: formData.get("averagePercentageViewed"),
    likes: formData.get("likes"),
    comments: formData.get("comments"),
    subscribersGained: formData.get("subscribersGained"),
  });
  if (!parsed.success)
    redirect(analyticsLocation("error", "성과 수치의 형식을 확인해 주세요."));

  const { supabase } = await requireWorkspace();
  const { error } = await supabase.rpc("record_youtube_metric_snapshot", {
    p_publication_id: parsed.data.publicationId,
    p_captured_at: koreanLocalDateTimeToIso(parsed.data.capturedAt),
    p_views: parsed.data.views,
    p_impressions: parsed.data.impressions,
    p_click_through_rate: parsed.data.clickThroughRate,
    p_average_view_duration_seconds: parsed.data.averageViewDurationSeconds,
    p_average_percentage_viewed: parsed.data.averagePercentageViewed,
    p_likes: parsed.data.likes,
    p_comments: parsed.data.comments,
    p_subscribers_gained: parsed.data.subscribersGained,
  });
  if (error)
    redirect(analyticsLocation("error", "성과 스냅샷을 저장하지 못했습니다."));
  revalidatePath("/youtube");
  redirect(analyticsLocation("saved", "성과 스냅샷을 저장했습니다."));
}
