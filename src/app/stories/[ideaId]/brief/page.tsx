import Link from "next/link";
import { notFound } from "next/navigation";

import { StudioShell } from "@/components/studio-shell";
import { getStarterIdea, starterIdeas } from "@/domain/discovery";
import type { Json } from "@/server/supabase/database.types";
import { requireWorkspace } from "@/server/workspace";
import { createBriefAction } from "@/app/discover/actions";

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

  const { data: existingBrief } = idea.episode_id
    ? await supabase
        .from("story_brief_versions")
        .select("id, content, status, version")
        .eq("episode_id", idea.episode_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

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
    </StudioShell>
  );
}
