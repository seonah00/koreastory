"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  matchFindingsToSources,
  normalizeSourceUrl,
  researchRequestSchema,
} from "@/domain/research";
import { runOpenAIResearch } from "@/server/ai/openai-research";
import { getServerEnv } from "@/server/env";
import { requireWorkspace } from "@/server/workspace";

function researchLocation(
  ideaId: string,
  key: "research" | "researchError",
  message: string,
) {
  return `/stories/${ideaId}/brief?${key}=${encodeURIComponent(message)}#research`;
}

export async function runResearchAction(formData: FormData) {
  const parsed = researchRequestSchema.safeParse({
    ideaId: formData.get("ideaId"),
  });
  if (!parsed.success) redirect("/discover?error=올바르지+않은+소재입니다.");

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    redirect(
      researchLocation(
        parsed.data.ideaId,
        "researchError",
        "OPENAI_API_KEY 설정이 필요합니다.",
      ),
    );
  }

  const { supabase, workspaceId } = await requireWorkspace();
  const { data: idea } = await supabase
    .from("story_ideas")
    .select("id, title, synopsis, episode_id, category_presets(name)")
    .eq("workspace_id", workspaceId)
    .eq("id", parsed.data.ideaId)
    .maybeSingle();

  if (!idea) redirect("/discover?error=소재를+찾을+수+없습니다.");

  const requestSummary = {
    ideaId: idea.id,
    title: idea.title,
    category: idea.category_presets?.name ?? "Korean folklore",
    searchContextSize: "medium",
  };
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      episode_id: idea.episode_id,
      provider: "openai",
      model: env.OPENAI_RESEARCH_MODEL,
      kind: "web_research",
      status: "pending",
      request: requestSummary,
    })
    .select("id")
    .single();

  if (generationError) {
    redirect(
      researchLocation(
        idea.id,
        "researchError",
        "리서치 기록을 만들지 못했습니다.",
      ),
    );
  }

  await supabase
    .from("generations")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", generation.id);

  try {
    const research = await runOpenAIResearch({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_RESEARCH_MODEL,
      title: idea.title,
      synopsis: idea.synopsis ?? "No synopsis provided.",
      category: idea.category_presets?.name ?? "Korean folklore",
    });
    const findings = matchFindingsToSources(research.result, research.sources);

    if (findings.length < 2) {
      throw new Error(
        "Research did not return enough findings tied to cited sources.",
      );
    }

    const uniqueSources = [
      ...new Map(
        research.sources.map((source) => [
          normalizeSourceUrl(source.url),
          source,
        ]),
      ).entries(),
    ]
      .filter(
        (entry): entry is [string, (typeof research.sources)[number]] =>
          entry[0] !== null,
      )
      .map(([, source]) => source);
    const { data: documents, error: documentsError } = await supabase
      .from("source_documents")
      .insert(
        uniqueSources.map((source) => ({
          workspace_id: workspaceId,
          story_idea_id: idea.id,
          title: source.title,
          source_url: source.url,
          publisher: new URL(source.url).hostname.replace(/^www\./, ""),
          metadata: { generationId: generation.id, provider: "openai" },
        })),
      )
      .select("id, source_url");

    if (documentsError || !documents)
      throw new Error("Could not save research sources.");

    const documentByUrl = new Map(
      documents.map((document) => [
        normalizeSourceUrl(document.source_url ?? ""),
        document.id,
      ]),
    );
    const evidenceRows = findings.flatMap((finding) => {
      const documentId = documentByUrl.get(
        normalizeSourceUrl(finding.sourceUrl),
      );
      return documentId
        ? [
            {
              workspace_id: workspaceId,
              story_idea_id: idea.id,
              episode_id: idea.episode_id,
              source_document_id: documentId,
              claim: finding.claim,
              evidence_excerpt: finding.evidenceExcerpt,
              confidence: finding.confidence,
            },
          ]
        : [];
    });
    const { error: evidenceError } = await supabase
      .from("research_evidence")
      .insert(evidenceRows);
    if (evidenceError) throw new Error("Could not save research evidence.");

    await supabase
      .from("generations")
      .update({
        status: "succeeded",
        response: {
          responseId: research.responseId,
          summary: research.result.summary,
          culturalContext: research.result.culturalContext,
          contentRisks: research.result.contentRisks,
          sourceCount: uniqueSources.length,
          evidenceCount: evidenceRows.length,
        },
        input_tokens: research.usage?.input_tokens,
        output_tokens: research.usage?.output_tokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 1000)
        : "Unknown research error";
    await supabase
      .from("generations")
      .update({
        status: "failed",
        error: { message },
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id);
    redirect(
      researchLocation(
        idea.id,
        "researchError",
        "웹 리서치에 실패했습니다. 기록에서 실패 원인을 확인할 수 있습니다.",
      ),
    );
  }

  revalidatePath(`/stories/${idea.id}/brief`);
  redirect(
    researchLocation(idea.id, "research", "AI 웹 리서치가 완료되었습니다."),
  );
}
