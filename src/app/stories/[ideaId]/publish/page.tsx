import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approvePublishPackageAction,
  approvePublishThumbnailAction,
  generatePublishPackageAction,
  generateThumbnailAction,
  selectPublishTitleAction,
} from "./actions";
import { StudioShell } from "@/components/studio-shell";
import {
  chapterTimestamp,
  publishPackageContentSchema,
} from "@/domain/publish-package";
import { requireWorkspace } from "@/server/workspace";

export default async function PublishStudioPage({
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
    .select("id, title, episode_id, category_presets(name)")
    .eq("workspace_id", workspaceId)
    .eq("id", ideaId)
    .maybeSingle();
  if (!idea) notFound();

  const [{ data: episode }, { data: packages }] = await Promise.all([
    idea.episode_id
      ? supabase
          .from("episodes")
          .select("stage")
          .eq("workspace_id", workspaceId)
          .eq("id", idea.episode_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    idea.episode_id
      ? supabase
          .from("publish_package_versions")
          .select(
            "id, version, status, content, thumbnail_asset_id, created_at",
          )
          .eq("workspace_id", workspaceId)
          .eq("episode_id", idea.episode_id)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const latest = packages?.[0] ?? null;
  const content = publishPackageContentSchema.safeParse(latest?.content);
  const { data: thumbnail } = latest?.thumbnail_asset_id
    ? await supabase
        .from("assets")
        .select("id, status, storage_bucket, storage_path")
        .eq("workspace_id", workspaceId)
        .eq("id", latest.thumbnail_asset_id)
        .maybeSingle()
    : { data: null };
  const { data: thumbnailUrl } = thumbnail
    ? await supabase.storage
        .from(thumbnail.storage_bucket)
        .createSignedUrl(thumbnail.storage_path, 3600)
    : { data: null };
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;
  const canCreate = episode && ["ready", "published"].includes(episode.stage);

  return (
    <StudioShell active="YouTube" email={email} workspaceName={workspaceName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          href={`/stories/${idea.id}/render`}
        >
          ← Review &amp; Export로 돌아가기
        </Link>
        <span className="text-sm font-medium text-[var(--rust)]">
          {idea.category_presets?.name}
        </span>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-medium text-[var(--rust)]">
            YOUTUBE PACKAGE
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
            {idea.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            카테고리에 맞는 제목·설명·챕터·태그·썸네일 시안을 생성하고, 운영자가
            최종 선택한 게시 패키지를 승인해 잠급니다.
          </p>
        </div>
        <form action={generatePublishPackageAction}>
          <input name="ideaId" type="hidden" value={idea.id} />
          <button
            className="rounded-full bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
            disabled={!canCreate}
            type="submit"
          >
            {latest ? "새 패키지 버전 생성" : "게시 패키지 생성"}
          </button>
        </form>
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
      {!canCreate ? (
        <p className="mt-6 rounded-xl bg-[#fff7df] p-4 text-sm text-[#735718]">
          Render Studio에서 MP4와 VTT·SRT 검수를 완료하고 Episode를 Ready로
          전환해 주세요.
        </p>
      ) : null}

      {latest && content.success ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Package", `v${latest.version}`],
              ["Status", latest.status],
              ["Episode", episode?.stage ?? "unknown"],
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

          <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <h2 className="text-xl font-semibold">제목 후보</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              썸네일 문구와 함께 보았을 때 가장 강하고 정확한 제목을 선택하세요.
            </p>
            <form action={selectPublishTitleAction} className="mt-5 grid gap-3">
              <input name="ideaId" type="hidden" value={idea.id} />
              <input
                name="publishPackageVersionId"
                type="hidden"
                value={latest.id}
              />
              {content.data.titleOptions.map((title) => (
                <label
                  className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4"
                  key={title}
                >
                  <input
                    defaultChecked={content.data.selectedTitle === title}
                    disabled={latest.status === "approved"}
                    name="selectedTitle"
                    required
                    type="radio"
                    value={title}
                  />
                  <span className="font-medium">{title}</span>
                </label>
              ))}
              {latest.status === "draft" ? (
                <button
                  className="mt-1 w-fit rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                  type="submit"
                >
                  대표 제목 저장
                </button>
              ) : null}
            </form>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
              <h2 className="text-xl font-semibold">설명문</h2>
              <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 whitespace-pre-wrap text-[var(--muted)]">
                {content.data.description}
              </p>
              <h3 className="mt-6 font-semibold">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {content.data.tags.map((tag) => (
                  <span
                    className="rounded-full bg-[#f3eee4] px-3 py-1.5 text-xs"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
              <h2 className="text-xl font-semibold">Chapters</h2>
              <ol className="mt-4 grid gap-2">
                {content.data.chapters.map((chapter) => (
                  <li
                    className="flex gap-3 rounded-xl bg-white p-3 text-sm"
                    key={`${chapter.startSeconds}-${chapter.title}`}
                  >
                    <span className="font-mono text-[var(--rust)]">
                      {chapterTimestamp(chapter.startSeconds)}
                    </span>
                    <span>{chapter.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Thumbnail</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {content.data.thumbnail.visualHook}
                </p>
              </div>
              <span className="rounded-full bg-[var(--rust)] px-4 py-2 text-sm font-semibold text-white">
                {content.data.thumbnail.headline}
              </span>
            </div>
            {thumbnailUrl?.signedUrl ? (
              <div className="mt-5 overflow-hidden rounded-xl bg-[#171913]">
                <div className="relative aspect-[3/2]">
                  <Image
                    alt="YouTube thumbnail artwork"
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 900px, 100vw"
                    src={thumbnailUrl.signedUrl}
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-6">
                    <p className="max-w-[70%] text-4xl font-black tracking-tight text-white drop-shadow-lg sm:text-6xl">
                      {content.data.thumbnail.headline}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-white p-4 text-sm leading-6 text-[var(--muted)]">
                {content.data.thumbnail.imagePrompt}
              </p>
            )}
            {latest.status === "draft" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <form action={generateThumbnailAction}>
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <button
                    className="rounded-full bg-[var(--pine)] px-4 py-2 text-sm font-semibold text-white"
                    name="publishPackageVersionId"
                    value={latest.id}
                  >
                    {thumbnail ? "새 썸네일 시안 생성" : "썸네일 시안 생성"}
                  </button>
                </form>
                {thumbnail?.status === "draft" ? (
                  <form action={approvePublishThumbnailAction}>
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <input name="assetId" type="hidden" value={thumbnail.id} />
                    <button
                      className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                      name="publishPackageVersionId"
                      value={latest.id}
                    >
                      썸네일 승인
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <div>
              <h2 className="text-xl font-semibold">Export</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                승인된 패키지는 수정할 수 없으며 JSON과 복사용 TXT로 내보낼 수
                있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {latest.status === "approved" ? (
                <>
                  <a
                    className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                    download
                    href={`/stories/${idea.id}/publish/export?format=json`}
                  >
                    JSON
                  </a>
                  <a
                    className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                    download
                    href={`/stories/${idea.id}/publish/export?format=text`}
                  >
                    TXT
                  </a>
                  <a
                    className="rounded-full border border-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine)]"
                    download
                    href={`/stories/${idea.id}/publish/thumbnail`}
                  >
                    Thumbnail PNG
                  </a>
                </>
              ) : null}
              {latest.status === "draft" ? (
                <form action={approvePublishPackageAction}>
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <button
                    className="rounded-full bg-[var(--rust)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
                    disabled={
                      !content.data.selectedTitle ||
                      thumbnail?.status !== "approved"
                    }
                    name="publishPackageVersionId"
                    value={latest.id}
                  >
                    패키지 승인·잠금
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        </>
      ) : latest ? (
        <p className="mt-8 rounded-xl bg-[#fff0ed] p-4 text-sm text-[#8a3027]">
          저장된 게시 패키지 형식이 현재 스키마와 맞지 않습니다.
        </p>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
          아직 게시 패키지가 없습니다.
        </p>
      )}
    </StudioShell>
  );
}
