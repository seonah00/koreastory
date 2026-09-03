alter table public.research_evidence
  alter column episode_id drop not null,
  add column story_idea_id uuid references public.story_ideas(id) on delete cascade,
  add constraint research_evidence_context_check
    check (num_nonnulls(story_idea_id, episode_id) >= 1);

create index research_evidence_story_idea_id_idx
  on public.research_evidence(story_idea_id);
