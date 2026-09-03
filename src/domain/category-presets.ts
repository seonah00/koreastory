export type CategoryPresetKey =
  "grandma" | "strange" | "legends" | "sleep" | "wisdom";

export type CategoryPresetSummary = {
  key: CategoryPresetKey;
  name: string;
  symbol: string;
  role: string;
  description: string;
  signals: readonly string[];
  tint: string;
};

export const categoryPresets = [
  {
    key: "grandma",
    name: "Grandma's Tales",
    symbol: "🌙",
    role: "재방문",
    description: "따뜻함과 향수를 중심으로 풀어내는 가족 친화적인 옛이야기",
    signals: ["Warm", "Nostalgic", "Family"],
    tint: "#f1dfbd",
  },
  {
    key: "strange",
    name: "Strange Korean Tales",
    symbol: "👹",
    role: "신규 유입",
    description: "도깨비와 구미호, 기이한 기록을 호기심 강한 미스터리로 재구성",
    signals: ["Mystery", "Twist", "CTR"],
    tint: "#d9ddea",
  },
  {
    key: "legends",
    name: "Korean Legends",
    symbol: "🏔️",
    role: "IP 구축",
    description: "한국의 신화와 지역 전설을 깊이 있는 세계관 콘텐츠로 확장",
    signals: ["Mythic", "Culture", "Series"],
    tint: "#dce7d9",
  },
  {
    key: "sleep",
    name: "Stories for Sleep",
    symbol: "😴",
    role: "시청시간",
    description: "낮은 갈등과 잔잔한 감각 묘사로 오래 머무르는 수면 이야기",
    signals: ["Cozy", "Ambient", "Low conflict"],
    tint: "#dce3e8",
  },
  {
    key: "wisdom",
    name: "Old Korean Wisdom",
    symbol: "🍵",
    role: "팬층 형성",
    description: "욕망과 선택, 관계에 관한 옛이야기를 오늘의 삶과 연결",
    signals: ["Reflection", "Emotion", "Wisdom"],
    tint: "#e8dfd1",
  },
] as const satisfies readonly CategoryPresetSummary[];

export function getCategoryPreset(key: CategoryPresetKey) {
  return categoryPresets.find((preset) => preset.key === key);
}
