alter table public.scene_plan_versions
  add constraint scene_plan_versions_id_workspace_unique unique (id, workspace_id),
  drop constraint scene_plan_versions_episode_id_fkey,
  add constraint scene_plan_versions_episode_workspace_fkey
    foreign key (episode_id, workspace_id)
    references public.episodes(id, workspace_id)
    on delete cascade,
  drop constraint scene_plan_versions_script_version_id_fkey,
  add constraint scene_plan_versions_script_workspace_fkey
    foreign key (script_version_id, workspace_id)
    references public.script_versions(id, workspace_id);

alter table public.scenes
  add constraint scenes_id_workspace_unique unique (id, workspace_id),
  drop constraint scenes_scene_plan_version_id_fkey,
  add constraint scenes_plan_workspace_fkey
    foreign key (scene_plan_version_id, workspace_id)
    references public.scene_plan_versions(id, workspace_id)
    on delete cascade;

alter table public.script_segments
  add constraint script_segments_id_workspace_unique unique (id, workspace_id);

alter table public.scene_segments
  drop constraint scene_segments_scene_id_fkey,
  add constraint scene_segments_scene_workspace_fkey
    foreign key (scene_id, workspace_id)
    references public.scenes(id, workspace_id)
    on delete cascade,
  drop constraint scene_segments_script_segment_id_fkey,
  add constraint scene_segments_script_segment_workspace_fkey
    foreign key (script_segment_id, workspace_id)
    references public.script_segments(id, workspace_id)
    on delete cascade;

create or replace function public.create_scene_plan_version(
  p_episode_id uuid,
  p_script_version_id uuid,
  p_scenes jsonb
)
returns table (scene_plan_id uuid, version integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_version integer;
  v_plan_id uuid;
  v_scene_id uuid;
  v_scene jsonb;
  v_ordinality bigint;
  v_segment_count integer;
  v_mapping_count integer;
  v_distinct_count integer;
  v_valid_count integer;
begin
  if jsonb_typeof(p_scenes) <> 'array'
    or jsonb_array_length(p_scenes) < 4
    or jsonb_array_length(p_scenes) > 20 then
    raise exception 'scene plan must contain between 4 and 20 scenes';
  end if;

  select s.workspace_id into v_workspace_id
  from public.script_versions s
  join public.episodes e
    on e.id = s.episode_id
   and e.workspace_id = s.workspace_id
  where s.id = p_script_version_id
    and s.episode_id = p_episode_id
    and s.status = 'approved'
  for update of e;

  if not found then
    raise exception 'an approved script matching the episode is required';
  end if;

  select count(*) into v_segment_count
  from public.script_segments
  where script_version_id = p_script_version_id
    and workspace_id = v_workspace_id;

  select count(*), count(distinct mapped.position), count(s.id)
    into v_mapping_count, v_distinct_count, v_valid_count
  from jsonb_array_elements(p_scenes) scene(value)
  cross join lateral jsonb_array_elements_text(scene.value->'scriptSegmentPositions') mapped(position)
  left join public.script_segments s
    on s.script_version_id = p_script_version_id
   and s.workspace_id = v_workspace_id
   and s.position = mapped.position::integer;

  if v_segment_count = 0
    or v_mapping_count <> v_segment_count
    or v_distinct_count <> v_segment_count
    or v_valid_count <> v_segment_count then
    raise exception 'every script segment must be mapped exactly once';
  end if;

  select coalesce(max(p.version), 0) + 1 into v_version
  from public.scene_plan_versions p
  where p.episode_id = p_episode_id;

  insert into public.scene_plan_versions (
    workspace_id,
    episode_id,
    script_version_id,
    version
  ) values (
    v_workspace_id,
    p_episode_id,
    p_script_version_id,
    v_version
  ) returning id into v_plan_id;

  for v_scene, v_ordinality in
    select value, ordinality
    from jsonb_array_elements(p_scenes) with ordinality
  loop
    insert into public.scenes (
      workspace_id,
      scene_plan_version_id,
      position,
      title,
      description,
      visual_prompt,
      negative_prompt,
      camera_motion,
      ambience,
      duration_ms,
      metadata
    ) values (
      v_workspace_id,
      v_plan_id,
      v_ordinality::integer - 1,
      nullif(trim(v_scene->>'title'), ''),
      trim(v_scene->>'description'),
      nullif(trim(v_scene->>'visualPrompt'), ''),
      nullif(trim(v_scene->>'negativePrompt'), ''),
      nullif(trim(v_scene->>'cameraMotion'), ''),
      nullif(trim(v_scene->>'ambience'), ''),
      greatest(10000, (v_scene->>'durationSeconds')::integer * 1000),
      jsonb_build_object(
        'scriptSegmentPositions',
        v_scene->'scriptSegmentPositions'
      )
    ) returning id into v_scene_id;

    insert into public.scene_segments (
      workspace_id,
      scene_id,
      script_segment_id,
      position
    )
    select
      v_workspace_id,
      v_scene_id,
      s.id,
      mapped.ordinality::integer - 1
    from jsonb_array_elements_text(v_scene->'scriptSegmentPositions')
      with ordinality as mapped(segment_position, ordinality)
    join public.script_segments s
      on s.script_version_id = p_script_version_id
     and s.workspace_id = v_workspace_id
     and s.position = mapped.segment_position::integer;
  end loop;

  update public.episodes
  set stage = 'scenes'
  where id = p_episode_id;

  return query select v_plan_id, v_version;
end;
$$;

revoke all on function public.create_scene_plan_version(uuid, uuid, jsonb)
  from public, anon;
grant execute on function public.create_scene_plan_version(uuid, uuid, jsonb)
  to authenticated;
