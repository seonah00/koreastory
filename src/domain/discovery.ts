import { z } from "zod";

export const discoveryCategorySchema = z.enum([
  "grandmas-tales",
  "strange-tales",
  "korean-legends",
  "stories-for-sleep",
  "old-korean-wisdom",
]);

export type DiscoveryCategory = z.infer<typeof discoveryCategorySchema>;

export type StarterIdea = {
  id: string;
  category: DiscoveryCategory;
  title: string;
  koreanTitle: string;
  synopsis: string;
  hook: string;
  sourceKind: "folklore" | "legend" | "myth" | "original";
  mood: string;
  scores: Record<string, number>;
  rationale: string;
};

export const starterIdeas = [
  {
    id: "tiger-dried-persimmon",
    category: "grandmas-tales",
    title: "The Tiger Who Feared a Dried Persimmon",
    koreanTitle: "호랑이와 곶감",
    synopsis:
      "A proud tiger mistakes a baby's silence for proof that a dried persimmon is more frightening than he is.",
    hook: "The fiercest tiger in Korea feared one thing—and it was not a hunter.",
    sourceKind: "folklore",
    mood: "Warm · Playful",
    scores: { globalAppeal: 94, warmth: 88, visual: 91 },
    rationale:
      "유머가 보편적이고 호랑이·한옥·겨울밤의 시각적 장면이 선명합니다.",
  },
  {
    id: "green-frog",
    category: "grandmas-tales",
    title: "The Green Frog Who Never Listened",
    koreanTitle: "청개구리 이야기",
    synopsis:
      "A contrary young frog learns too late why his mother's simplest wishes mattered.",
    hook: "He did the opposite of everything his mother asked—until her final request.",
    sourceKind: "folklore",
    mood: "Tender · Bittersweet",
    scores: { emotion: 95, globalAppeal: 90, family: 86 },
    rationale:
      "부모와 자식의 감정이 문화권을 넘어 전달되고 잔잔한 여운이 강합니다.",
  },
  {
    id: "dokkaebi-door",
    category: "strange-tales",
    title: "The Goblin Who Knocked Every Night",
    koreanTitle: "밤마다 찾아온 도깨비",
    synopsis:
      "A farmer welcomes a mysterious nighttime visitor whose gifts slowly reveal a dangerous rule.",
    hook: "Every night, a goblin knocked on his door—and left behind one impossible gift.",
    sourceKind: "folklore",
    mood: "Mysterious · Moonlit",
    scores: { ctr: 94, uniqueness: 96, twist: 89 },
    rationale:
      "도깨비의 한국적 독창성과 반복되는 밤의 미스터리가 클릭과 유지율에 유리합니다.",
  },
  {
    id: "gumiho-lantern",
    category: "strange-tales",
    title: "The Woman Beneath the Moonlit Lantern",
    koreanTitle: "달빛 등불 아래의 구미호",
    synopsis:
      "A traveler ignores a village warning and follows a beautiful stranger into a silent forest.",
    hook: "The villagers warned him never to follow a lantern into the mountain after midnight.",
    sourceKind: "legend",
    mood: "Eerie · Restrained",
    scores: { ctr: 96, visual: 95, globalAppeal: 87 },
    rationale:
      "구미호를 직접 노출하지 않는 호기심형 제목과 달빛 비주얼이 강합니다.",
  },
  {
    id: "princess-bari",
    category: "korean-legends",
    title: "Princess Bari: The Abandoned Daughter Who Crossed the Underworld",
    koreanTitle: "바리공주",
    synopsis:
      "An abandoned princess journeys beyond the living world to save the parents who rejected her.",
    hook: "They abandoned their seventh daughter. Years later, only she could save them.",
    sourceKind: "myth",
    mood: "Mythic · Melancholic",
    scores: { culturalUniqueness: 99, storyDepth: 98, series: 94 },
    rationale:
      "한국 무속 신화의 대표 서사로 감정, 세계관, 장기 IP 확장성이 뛰어납니다.",
  },
  {
    id: "imugi-dragon",
    category: "korean-legends",
    title: "The Serpent Who Waited a Thousand Years to Become a Dragon",
    koreanTitle: "용이 되기를 기다린 이무기",
    synopsis:
      "An ancient serpent must endure one final human test before ascending to the sky.",
    hook: "For a thousand years, the creature beneath the river waited for one chance to become a dragon.",
    sourceKind: "legend",
    mood: "Epic · Mystical",
    scores: { visual: 98, globalAppeal: 92, series: 91 },
    rationale:
      "용과 다른 이무기의 개념을 소개하면서 웅장한 한국 산수 비주얼을 만들 수 있습니다.",
  },
  {
    id: "rainy-joseon-night",
    category: "stories-for-sleep",
    title: "A Rainy Night in a Joseon Village",
    koreanTitle: "비 내리는 조선 마을의 밤",
    synopsis:
      "A gentle walk past lanterns, tiled roofs, warm kitchens, and rain-darkened stone walls.",
    hook: "Tonight, there is nowhere you need to go. Let us walk slowly through the rain.",
    sourceKind: "original",
    mood: "Cozy · Rainy",
    scores: { sleep: 99, cozy: 97, ambient: 98 },
    rationale:
      "갈등 없이 감각 묘사와 환경음만으로 30~60분 수면 콘텐츠 확장이 가능합니다.",
  },
  {
    id: "winter-temple-lantern",
    category: "stories-for-sleep",
    title: "The Lantern Keeper of a Snowy Mountain Temple",
    koreanTitle: "눈 내리는 산사의 등불지기",
    synopsis:
      "An elderly keeper lights each lantern as snow settles over a quiet mountain temple.",
    hook: "As the mountain disappeared beneath the snow, one warm lantern remained.",
    sourceKind: "original",
    mood: "Quiet · Winter",
    scores: { sleep: 97, visual: 94, conflict: 4 },
    rationale:
      "반복 행동과 눈·종소리·등불을 활용해 저자극 영상과 오디오를 만들기 좋습니다.",
  },
  {
    id: "one-wish-farmer",
    category: "old-korean-wisdom",
    title: "The Poor Farmer Who Chose the Wrong Wish",
    koreanTitle: "한 가지 소원을 잘못 고른 농부",
    synopsis:
      "A poor farmer receives one wish and discovers that wanting more can cost what he already has.",
    hook: "A poor farmer was given one wish. By sunset, he wished he had chosen nothing.",
    sourceKind: "folklore",
    mood: "Reflective · Human",
    scores: { relevance: 96, lesson: 94, emotion: 88 },
    rationale:
      "욕망과 선택이라는 현대적인 주제를 짧고 강한 교훈 구조로 전달합니다.",
  },
  {
    id: "three-bowls-rice",
    category: "old-korean-wisdom",
    title: "The Family With Only Three Bowls of Rice",
    koreanTitle: "세 그릇의 밥을 나눈 가족",
    synopsis:
      "A family with too little food reveals who they are through the way they divide one final meal.",
    hook: "There were four people at the table—but only three bowls of rice.",
    sourceKind: "folklore",
    mood: "Warm · Reflective",
    scores: { emotion: 96, relevance: 92, globalAppeal: 91 },
    rationale:
      "단순한 선택 하나로 가족·희생·배려를 보여줘 성인 시청자의 댓글 반응을 유도합니다.",
  },
] as const satisfies readonly StarterIdea[];

export const saveIdeaSchema = z.object({
  starterId: z.string().min(1),
});

export const customIdeaSchema = z.object({
  category: discoveryCategorySchema,
  title: z.string().trim().min(3).max(160),
  synopsis: z.string().trim().min(10).max(1200),
});

export const briefSchema = z.object({
  ideaId: z.uuid(),
  globalHook: z.string().trim().min(10).max(500),
  coreEmotion: z.string().trim().min(3).max(160),
  adaptationDirection: z.string().trim().min(10).max(1200),
  audiencePromise: z.string().trim().min(10).max(500),
  mood: z.string().trim().min(3).max(160),
  targetDurationMinutes: z.coerce.number().int().min(10).max(90),
});

export function getStarterIdea(id: string) {
  return starterIdeas.find((idea) => idea.id === id);
}

export function ideasForCategory(category: string | undefined) {
  const parsed = discoveryCategorySchema.safeParse(category);
  return parsed.success
    ? starterIdeas.filter((idea) => idea.category === parsed.data)
    : starterIdeas;
}
