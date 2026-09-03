alter table public.story_ideas
  add constraint story_ideas_id_workspace_unique unique (id, workspace_id);

alter table public.source_documents
  drop constraint source_documents_story_idea_id_fkey,
  add constraint source_documents_story_idea_workspace_fkey
    foreign key (story_idea_id, workspace_id)
    references public.story_ideas(id, workspace_id)
    on delete cascade;

alter table public.research_evidence
  drop constraint research_evidence_story_idea_id_fkey,
  add constraint research_evidence_story_idea_workspace_fkey
    foreign key (story_idea_id, workspace_id)
    references public.story_ideas(id, workspace_id)
    on delete cascade;
