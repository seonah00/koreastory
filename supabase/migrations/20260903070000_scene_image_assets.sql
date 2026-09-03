alter table public.generations
  add constraint generations_id_workspace_unique unique (id, workspace_id);

alter table public.assets
  drop constraint assets_episode_id_fkey,
  add column scene_id uuid,
  add column generation_id uuid,
  add constraint assets_episode_workspace_fkey
    foreign key (episode_id, workspace_id)
    references public.episodes(id, workspace_id)
    on delete set null (episode_id),
  add constraint assets_scene_workspace_fkey
    foreign key (scene_id, workspace_id)
    references public.scenes(id, workspace_id)
    on delete set null (scene_id),
  add constraint assets_generation_workspace_fkey
    foreign key (generation_id, workspace_id)
    references public.generations(id, workspace_id)
    on delete set null (generation_id);

create index assets_scene_created_idx
  on public.assets(scene_id, created_at desc)
  where scene_id is not null;

create unique index assets_generation_unique
  on public.assets(generation_id)
  where generation_id is not null;
