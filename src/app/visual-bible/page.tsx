import {
  approveBibleReferenceAction,
  approveBibleEntryAction,
  createBibleEntryAction,
  saveBibleVersionAction,
  saveCategoryVisualPresetAction,
  uploadBibleReferenceAction,
} from "./actions";
import Image from "next/image";
import { StudioShell } from "@/components/studio-shell";
import { latestBibleEntries } from "@/domain/visual-bible";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";

type Search = Promise<Record<string, string | string[] | undefined>>;

function rule(rules: Json, key: string) {
  if (rules && typeof rules === "object" && !Array.isArray(rules)) {
    const value = rules[key];
    return typeof value === "string" ? value : "";
  }
  return "";
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--pine)]";

export default async function VisualBiblePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const [query, context] = await Promise.all([
    searchParams,
    requireWorkspace(),
  ]);
  const { supabase, workspaceId, workspaceName, email } = context;
  const [entriesResult, presetsResult, referencesResult] = await Promise.all([
    supabase
      .from("bible_entries")
      .select("id, kind, slug, name, version, status, content, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("category_presets")
      .select("id, slug, name, visual_rules")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("bible_references")
      .select(
        "id, bible_entry_id, label, position, assets(id, status, storage_bucket, storage_path, mime_type)",
      )
      .eq("workspace_id", workspaceId)
      .order("position"),
  ]);
  const entries = entriesResult.data ?? [];
  const latest = latestBibleEntries(entries).sort((a, b) =>
    `${a.kind}:${a.slug}`.localeCompare(`${b.kind}:${b.slug}`),
  );
  const versionCounts = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.slug}`;
    versionCounts.set(key, (versionCounts.get(key) ?? 0) + 1);
  }
  const saved = typeof query.saved === "string" ? query.saved : null;
  const error = typeof query.error === "string" ? query.error : null;
  const references = await Promise.all(
    (referencesResult.data ?? []).map(async (reference) => {
      const asset = reference.assets;
      if (!asset) return { ...reference, signedUrl: null };
      const { data } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);
      return { ...reference, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <StudioShell active="Visuals" email={email} workspaceName={workspaceName}>
      <div>
        <p className="text-sm font-medium text-[var(--rust)]">VISUAL BIBLE</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
          K-Lore의 얼굴과 세계를 고정하세요.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          전체 화풍, 할머니 캐릭터와 목소리, 한옥방을 버전으로 관리합니다.
          승인한 버전은 잠기며 수정할 때는 새 Draft가 생성됩니다.
        </p>
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

      <section className="mt-10" aria-labelledby="bible-title">
        <h2 id="bible-title" className="text-2xl font-semibold">
          Brand · Character · World Bible
        </h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {latest.map((entry) => (
            <article
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              key={`${entry.kind}:${entry.slug}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium tracking-wide text-[var(--rust)] uppercase">
                    {entry.kind} · {entry.slug}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{entry.name}</h3>
                </div>
                <div className="text-right text-xs text-[var(--muted)]">
                  <p>
                    v{entry.version} · {entry.status}
                  </p>
                  <p>
                    {versionCounts.get(`${entry.kind}:${entry.slug}`)} versions
                  </p>
                </div>
              </div>
              <form action={saveBibleVersionAction} className="mt-5 space-y-3">
                <input name="entryId" type="hidden" value={entry.id} />
                <input name="kind" type="hidden" value={entry.kind} />
                <input name="slug" type="hidden" value={entry.slug} />
                <label className="block text-xs font-medium">
                  이름
                  <input
                    className={fieldClass}
                    defaultValue={entry.name}
                    name="name"
                    required
                  />
                </label>
                <label className="block text-xs font-medium">
                  규칙 JSON
                  <textarea
                    className={`${fieldClass} min-h-64 font-mono text-xs leading-5`}
                    defaultValue={JSON.stringify(entry.content, null, 2)}
                    name="content"
                    required
                  />
                </label>
                <button
                  className="rounded-full bg-[var(--pine)] px-5 py-2.5 text-sm font-semibold text-white"
                  type="submit"
                >
                  새 Draft 버전으로 저장
                </button>
              </form>
              {entry.status === "draft" ? (
                <form action={approveBibleEntryAction} className="mt-3">
                  <input name="entryId" type="hidden" value={entry.id} />
                  <button
                    className="rounded-full border border-[var(--pine)] px-5 py-2 text-sm font-semibold text-[var(--pine)]"
                    type="submit"
                  >
                    이 버전 승인·잠금
                  </button>
                </form>
              ) : null}
              {entry.status === "approved" && entry.kind !== "voice" ? (
                <div className="mt-5 border-t border-[var(--line)] pt-5">
                  <p className="text-sm font-semibold">Reference images</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {references
                      .filter(
                        (reference) => reference.bible_entry_id === entry.id,
                      )
                      .map((reference) => (
                        <div
                          className="overflow-hidden rounded-xl border border-[var(--line)]"
                          key={reference.id}
                        >
                          {reference.signedUrl ? (
                            <Image
                              alt={reference.label ?? "Bible reference"}
                              className="aspect-square w-full object-cover"
                              height={240}
                              src={reference.signedUrl}
                              width={240}
                            />
                          ) : null}
                          <div className="p-2 text-xs">
                            <p className="truncate font-medium">
                              {reference.label}
                            </p>
                            <p className="text-[var(--muted)]">
                              {reference.assets?.status}
                            </p>
                            {reference.assets?.status === "draft" ? (
                              <form
                                action={approveBibleReferenceAction}
                                className="mt-2"
                              >
                                <input
                                  name="assetId"
                                  type="hidden"
                                  value={reference.assets.id}
                                />
                                <button
                                  className="rounded-full border border-[var(--pine)] px-3 py-1 font-semibold text-[var(--pine)]"
                                  type="submit"
                                >
                                  승인·잠금
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ))}
                  </div>
                  <form
                    action={uploadBibleReferenceAction}
                    className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                    encType="multipart/form-data"
                  >
                    <input name="entryId" type="hidden" value={entry.id} />
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      className={fieldClass}
                      name="referenceImage"
                      required
                      type="file"
                    />
                    <input
                      className={fieldClass}
                      maxLength={80}
                      name="label"
                      placeholder="정면, 3/4, 겨울 방…"
                      required
                    />
                    <button
                      className="self-end rounded-full bg-[var(--rust)] px-4 py-2.5 text-sm font-semibold text-white"
                      type="submit"
                    >
                      등록
                    </button>
                  </form>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    PNG·JPEG·WebP, 최대 7MB. 등록 후 승인해야 생성에 사용됩니다.
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="preset-title">
        <h2 id="preset-title" className="text-2xl font-semibold">
          카테고리 이미지 프리셋
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          K-Lore 공통 화풍은 유지하면서 색감, 빛, 구도와 분위기만 카테고리별로
          조절합니다.
        </p>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {(presetsResult.data ?? []).map((preset) => (
            <form
              action={saveCategoryVisualPresetAction}
              className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              key={preset.id}
            >
              <input name="categoryId" type="hidden" value={preset.id} />
              <p className="text-xs font-medium text-[var(--rust)]">
                {preset.slug}
              </p>
              <h3 className="mt-1 text-xl font-semibold">{preset.name}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["palette", "색상"],
                  ["lighting", "조명"],
                  ["composition", "구도"],
                  ["atmosphere", "분위기"],
                ].map(([key, label]) => (
                  <label className="block text-xs font-medium" key={key}>
                    {label}
                    <textarea
                      className={`${fieldClass} min-h-24`}
                      defaultValue={rule(preset.visual_rules, key)}
                      name={key}
                      required
                    />
                  </label>
                ))}
              </div>
              <label className="mt-3 block text-xs font-medium">
                스타일 보정 규칙
                <textarea
                  className={`${fieldClass} min-h-24`}
                  defaultValue={rule(preset.visual_rules, "styleModifiers")}
                  name="styleModifiers"
                  required
                />
              </label>
              <button
                className="mt-4 rounded-full bg-[var(--rust)] px-5 py-2.5 text-sm font-semibold text-white"
                type="submit"
              >
                프리셋 저장
              </button>
            </form>
          ))}
        </div>
      </section>

      <section
        className="mt-12 rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-6"
        aria-labelledby="new-entry-title"
      >
        <h2 id="new-entry-title" className="text-xl font-semibold">
          재사용 Bible 항목 추가
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          새 도깨비, 호랑이, 마을 또는 스타일을 Draft v1으로 등록합니다.
        </p>
        <form
          action={createBibleEntryAction}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <label className="text-xs font-medium">
            종류
            <select className={fieldClass} defaultValue="character" name="kind">
              <option value="character">Character</option>
              <option value="world">World</option>
              <option value="style">Style</option>
              <option value="voice">Voice</option>
              <option value="brand">Brand</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Slug
            <input
              className={fieldClass}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="dokkaebi"
              required
            />
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            이름
            <input
              className={fieldClass}
              name="name"
              placeholder="K-Lore Dokkaebi"
              required
            />
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            규칙 JSON
            <textarea
              className={`${fieldClass} min-h-40 font-mono text-xs`}
              defaultValue={
                '{\n  "appearance": "",\n  "continuityRules": ""\n}'
              }
              name="content"
              required
            />
          </label>
          <button
            className="w-fit rounded-full bg-[var(--pine)] px-5 py-2.5 text-sm font-semibold text-white"
            type="submit"
          >
            Draft 항목 생성
          </button>
        </form>
      </section>
    </StudioShell>
  );
}
