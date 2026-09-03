alter table public.assets
  add column script_segment_id uuid,
  add constraint assets_script_segment_workspace_fkey
    foreign key (script_segment_id, workspace_id)
    references public.script_segments(id, workspace_id)
    on delete set null (script_segment_id);

create index assets_script_segment_workspace_fkey_idx
  on public.assets(script_segment_id, workspace_id)
  where script_segment_id is not null;

update public.bible_entries
set content = jsonb_build_object(
  'providerVoice', 'sage',
  'model', 'gpt-4o-mini-tts',
  'responseFormat', 'mp3'
) || content
where kind = 'voice'
  and slug = 'halmeoni-voice'
  and status = 'approved';
