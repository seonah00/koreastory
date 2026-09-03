create or replace function public.create_story_brief_from_idea(
  p_idea_id uuid,
  p_content jsonb,
  p_target_duration_seconds integer
)
returns table (episode_id uuid, brief_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_idea public.story_ideas%rowtype;
  v_episode_id uuid;
  v_brief_id uuid;
begin
  if jsonb_typeof(p_content) <> 'object' then
    raise exception 'brief content must be a JSON object';
  end if;

  if p_target_duration_seconds < 600 or p_target_duration_seconds > 5400 then
    raise exception 'target duration must be between 10 and 90 minutes';
  end if;

  select * into v_idea
  from public.story_ideas
  where id = p_idea_id
  for update;

  if not found then
    raise exception 'story idea not found';
  end if;

  if v_idea.episode_id is not null then
    raise exception 'story idea already has an episode';
  end if;

  insert into public.episodes (
    workspace_id,
    category_preset_id,
    working_title,
    stage,
    target_duration_seconds
  ) values (
    v_idea.workspace_id,
    v_idea.category_preset_id,
    v_idea.title,
    'brief',
    p_target_duration_seconds
  ) returning id into v_episode_id;

  insert into public.story_brief_versions (
    workspace_id,
    episode_id,
    version,
    content
  ) values (
    v_idea.workspace_id,
    v_episode_id,
    1,
    p_content
  ) returning id into v_brief_id;

  update public.story_ideas
  set episode_id = v_episode_id
  where id = v_idea.id;

  return query select v_episode_id, v_brief_id;
end;
$$;

revoke all on function public.create_story_brief_from_idea(uuid, jsonb, integer) from public, anon;
grant execute on function public.create_story_brief_from_idea(uuid, jsonb, integer) to authenticated;
