alter table public.render_versions
  add constraint render_versions_id_workspace_unique unique (id, workspace_id);

alter table public.render_versions
  drop constraint render_versions_episode_id_fkey,
  drop constraint render_versions_scene_plan_version_id_fkey,
  drop constraint render_versions_output_asset_id_fkey,
  add constraint render_versions_episode_workspace_fkey
    foreign key (episode_id, workspace_id)
    references public.episodes(id, workspace_id) on delete cascade,
  add constraint render_versions_scene_plan_workspace_fkey
    foreign key (scene_plan_version_id, workspace_id)
    references public.scene_plan_versions(id, workspace_id) on delete restrict,
  add constraint render_versions_output_asset_workspace_fkey
    foreign key (output_asset_id, workspace_id)
    references public.assets(id, workspace_id) on delete set null (output_asset_id);

create index render_versions_episode_workspace_fkey_idx
  on public.render_versions(episode_id, workspace_id);
create index render_versions_scene_plan_workspace_fkey_idx
  on public.render_versions(scene_plan_version_id, workspace_id);
create index render_versions_output_asset_workspace_fkey_idx
  on public.render_versions(output_asset_id, workspace_id)
  where output_asset_id is not null;

create or replace function public.create_render_version(
  p_episode_id uuid,
  p_scene_plan_version_id uuid,
  p_manifest jsonb
)
returns table (render_version_id uuid, version integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_version integer;
  v_id uuid;
  v_expected integer;
  v_approved integer;
begin
  if jsonb_typeof(p_manifest) <> 'object'
    or p_manifest ->> 'schemaVersion' <> '1'
    or p_manifest #>> '{composition,id}' <> 'KLoreEpisode'
    or coalesce(jsonb_array_length(p_manifest -> 'scenes'), 0) = 0 then
    raise exception 'invalid render manifest';
  end if;

  select workspace_id into v_workspace_id
  from public.episodes
  where id = p_episode_id
  for update;
  if not found then raise exception 'episode not found'; end if;

  perform 1 from public.scene_plan_versions
  where id = p_scene_plan_version_id
    and episode_id = p_episode_id
    and workspace_id = v_workspace_id
    and status = 'approved';
  if not found then raise exception 'approved scene plan required'; end if;

  select count(*) into v_expected
  from (
    select value #>> '{image,id}' as asset_id
    from jsonb_array_elements(p_manifest -> 'scenes')
    union
    select narration #>> '{asset,id}'
    from jsonb_array_elements(p_manifest -> 'scenes') scene,
      jsonb_array_elements(scene -> 'narration') narration
  ) referenced_assets;
  select count(*) into v_approved
  from public.assets a
  where a.workspace_id = v_workspace_id
    and a.episode_id = p_episode_id
    and a.status = 'approved'
    and a.id::text in (
      select value #>> '{image,id}'
      from jsonb_array_elements(p_manifest -> 'scenes')
      union
      select narration #>> '{asset,id}'
      from jsonb_array_elements(p_manifest -> 'scenes') scene,
        jsonb_array_elements(scene -> 'narration') narration
    );
  if v_expected <> v_approved then
    raise exception 'every image and narration asset must be approved';
  end if;

  select count(*) into v_expected
  from jsonb_array_elements(p_manifest -> 'audioLayers');
  select count(*) into v_approved
  from public.audio_layers l
  where l.workspace_id = v_workspace_id
    and l.episode_id = p_episode_id
    and l.status = 'approved'
    and l.id::text in (
      select value ->> 'id'
      from jsonb_array_elements(p_manifest -> 'audioLayers')
    );
  if v_expected <> v_approved then
    raise exception 'every audio layer must be approved';
  end if;

  select coalesce(max(rv.version), 0) + 1 into v_version
  from public.render_versions rv
  where rv.episode_id = p_episode_id;

  insert into public.render_versions (
    workspace_id, episode_id, scene_plan_version_id, version, manifest
  ) values (
    v_workspace_id, p_episode_id, p_scene_plan_version_id, v_version, p_manifest
  ) returning id into v_id;

  update public.episodes set stage = 'render' where id = p_episode_id;
  return query select v_id, v_version;
end;
$$;

revoke all on function public.create_render_version(uuid, uuid, jsonb)
  from public, anon;
grant execute on function public.create_render_version(uuid, uuid, jsonb)
  to authenticated;
