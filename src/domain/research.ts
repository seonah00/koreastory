import { z } from "zod";

export const researchRequestSchema = z.object({
  ideaId: z.uuid(),
});

export const researchResultSchema = z.object({
  summary: z.string().min(50).max(4000),
  culturalContext: z.string().min(30).max(3000),
  contentRisks: z.array(z.string().min(3).max(300)).max(8),
  findings: z
    .array(
      z.object({
        claim: z.string().min(10).max(800),
        evidenceExcerpt: z.string().min(10).max(1200),
        confidence: z.number().min(0).max(1),
        sourceUrl: z.url(),
      }),
    )
    .min(2)
    .max(10),
});

export type ResearchResult = z.infer<typeof researchResultSchema>;

export type ResearchSource = {
  title: string;
  url: string;
};

export function normalizeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function matchFindingsToSources(
  result: ResearchResult,
  sources: ResearchSource[],
) {
  const sourceUrls = new Set(
    sources.map((source) => normalizeSourceUrl(source.url)).filter(Boolean),
  );
  return result.findings.filter((finding) => {
    const normalized = normalizeSourceUrl(finding.sourceUrl);
    return normalized !== null && sourceUrls.has(normalized);
  });
}
