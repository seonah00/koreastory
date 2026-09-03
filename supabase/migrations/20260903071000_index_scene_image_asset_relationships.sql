create index assets_episode_workspace_fkey_idx
  on public.assets(episode_id, workspace_id)
  where episode_id is not null;

create index assets_generation_workspace_fkey_idx
  on public.assets(generation_id, workspace_id)
  where generation_id is not null;

create index assets_scene_workspace_fkey_idx
  on public.assets(scene_id, workspace_id)
  where scene_id is not null;

