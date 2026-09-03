alter table public.episodes
  add constraint episodes_id_workspace_unique unique (id, workspace_id);

alter table public.story_brief_versions
  add constraint story_brief_versions_id_workspace_unique unique (id, workspace_id);

alter table public.script_versions
  add constraint script_versions_id_workspace_unique unique (id, workspace_id),
  drop constraint script_versions_episode_id_fkey,
  add constraint script_versions_episode_workspace_fkey
    foreign key (episode_id, workspace_id)
    references public.episodes(id, workspace_id)
    on delete cascade,
  drop constraint script_versions_story_brief_version_id_fkey,
  add constraint script_versions_brief_workspace_fkey
    foreign key (story_brief_version_id, workspace_id)
    references public.story_brief_versions(id, workspace_id);

alter table public.script_segments
  drop constraint script_segments_script_version_id_fkey,
  add constraint script_segments_version_workspace_fkey
    foreign key (script_version_id, workspace_id)
    references public.script_versions(id, workspace_id)
    on delete cascade;

create or replace function public.create_script_version(
  p_episode_id uuid,
  p_story_brief_version_id uuid,
  p_title text,
  p_full_text text,
  p_segments jsonb
)
returns table (script_id uuid, version integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_version integer;
  v_script_id uuid;
begin
  if nullif(trim(p_title), '') is null then
    raise exception 'script title is required';
  end if;
  if length(trim(p_full_text)) < 500 then
    raise exception 'script text must contain at least 500 characters';
  end if;
  if jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) < 1 then
    raise exception 'script segments must be a non-empty JSON array';
  end if;

  select e.workspace_id into v_workspace_id
  from public.episodes e
  join public.story_brief_versions b
    on b.episode_id = e.id
   and b.workspace_id = e.workspace_id
  where e.id = p_episode_id
    and b.id = p_story_brief_version_id
  for update of e;

  if not found then
    raise exception 'episode and story brief do not match';
  end if;

  select coalesce(max(s.version), 0) + 1 into v_version
  from public.script_versions s
  where s.episode_id = p_episode_id;

  insert into public.script_versions (
    workspace_id,
    episode_id,
    story_brief_version_id,
    version,
    language_code,
    title,
    full_text
  ) values (
    v_workspace_id,
    p_episode_id,
    p_story_brief_version_id,
    v_version,
    'en',
    trim(p_title),
    trim(p_full_text)
  ) returning id into v_script_id;

  insert into public.script_segments (
    workspace_id,
    script_version_id,
    position,
    narration,
    emotion,
    estimated_duration_ms,
    metadata
  )
  select
    v_workspace_id,
    v_script_id,
    item.ordinality::integer - 1,
    trim(item.value->>'narration'),
    nullif(trim(item.value->>'emotion'), ''),
    greatest(0, coalesce((item.value->>'estimatedDurationSeconds')::integer, 0) * 1000),
    jsonb_build_object('segmentType', coalesce(item.value->>'segmentType', 'story'))
  from jsonb_array_elements(p_segments) with ordinality as item(value, ordinality)
  where nullif(trim(item.value->>'narration'), '') is not null;

  if not found then
    raise exception 'no valid script segments were supplied';
  end if;

  update public.episodes
  set stage = 'script'
  where id = p_episode_id;

  return query select v_script_id, v_version;
end;
$$;

revoke all on function public.create_script_version(uuid, uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.create_script_version(uuid, uuid, text, text, jsonb)
  to authenticated;
