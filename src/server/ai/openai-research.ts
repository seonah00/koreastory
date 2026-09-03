import { z } from "zod";

import { researchResultSchema, type ResearchSource } from "@/domain/research";

const apiResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  output: z.array(z.unknown()),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
});

const resultJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "culturalContext", "contentRisks", "findings"],
  properties: {
    summary: { type: "string" },
    culturalContext: { type: "string" },
    contentRisks: { type: "array", items: { type: "string" }, maxItems: 8 },
    findings: {
      type: "array",
      minItems: 2,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "evidenceExcerpt", "confidence", "sourceUrl"],
        properties: {
          claim: { type: "string" },
          evidenceExcerpt: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          sourceUrl: { type: "string" },
        },
      },
    },
  },
} as const;

function collectSources(output: unknown[]) {
  const sources = new Map<string, ResearchSource>();

  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.url === "string" && record.url.startsWith("http")) {
      sources.set(record.url, {
        url: record.url,
        title:
          typeof record.title === "string"
            ? record.title
            : new URL(record.url).hostname,
      });
    }
    Object.values(record).forEach(visit);
  }

  visit(output);
  return [...sources.values()];
}

function extractOutputText(output: unknown[]) {
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        typeof (part as Record<string, unknown>).text === "string"
      ) {
        return (part as Record<string, unknown>).text as string;
      }
    }
  }
  throw new Error("OpenAI response did not contain research text.");
}

export async function runOpenAIResearch({
  apiKey,
  category,
  model,
  synopsis,
  title,
}: {
  apiKey: string;
  category: string;
  model: string;
  synopsis: string;
  title: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      tools: [{ type: "web_search", search_context_size: "medium" }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      text: {
        format: {
          type: "json_schema",
          name: "k_lore_research",
          strict: true,
          schema: resultJsonSchema,
        },
      },
      input: `Research this Korean folklore content idea for an English-language YouTube production.\n\nTitle: ${title}\nCategory: ${category}\nSynopsis: ${synopsis}\n\nUse live web search. Prefer Korean government, museum, university, academic, encyclopedia, and established cultural sources. Distinguish documented tradition from modern retellings and regional variants. Never invent a source. Each finding must use the exact URL of a source you consulted. Evidence excerpts must be concise paraphrases, not long quotations. Identify cultural context and adaptation risks.`,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  const raw: unknown = await response.json();
  if (!response.ok) {
    const message =
      raw && typeof raw === "object" && "error" in raw
        ? JSON.stringify((raw as { error: unknown }).error)
        : response.statusText;
    throw new Error(`OpenAI research failed: ${message}`);
  }

  const parsedResponse = apiResponseSchema.parse(raw);
  const result = researchResultSchema.parse(
    JSON.parse(extractOutputText(parsedResponse.output)),
  );
  const sources = collectSources(parsedResponse.output);

  return {
    responseId: parsedResponse.id,
    result,
    sources,
    usage: parsedResponse.usage,
  };
}
