create table public.audio_layers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null,
  scene_id uuid,
  asset_id uuid not null,
  layer_type text not null check (layer_type in ('bgm','ambience','sfx')),
  label text not null check (char_length(label) between 1 and 120),
  start_ms integer not null default 0 check (start_ms >= 0),
  end_ms integer check (end_ms is null or end_ms > start_ms),
  volume_db numeric(5,2) not null default -18 check (volume_db between -60 and 6),
  fade_in_ms integer not null default 1000 check (fade_in_ms between 0 and 30000),
  fade_out_ms integer not null default 1000 check (fade_out_ms between 0 and 30000),
  loop boolean not null default false,
  notes text,
  status public.approval_status not null default 'draft',
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint audio_layers_episode_workspace_fkey foreign key (episode_id, workspace_id)
    references public.episodes(id, workspace_id) on delete cascade,
  constraint audio_layers_scene_workspace_fkey foreign key (scene_id, workspace_id)
    references public.scenes(id, workspace_id) on delete set null (scene_id),
  constraint audio_layers_asset_workspace_fkey foreign key (asset_id, workspace_id)
    references public.assets(id, workspace_id) on delete restrict
);

create index audio_layers_workspace_episode_idx on public.audio_layers(workspace_id, episode_id, start_ms);
create index audio_layers_scene_workspace_fkey_idx on public.audio_layers(scene_id, workspace_id) where scene_id is not null;
create index audio_layers_asset_workspace_fkey_idx on public.audio_layers(asset_id, workspace_id);

create trigger audio_layers_immutable before update or delete on public.audio_layers
for each row execute function private.protect_approved_record();

alter table public.audio_layers enable row level security;
create policy audio_layers_select on public.audio_layers for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy audio_layers_insert on public.audio_layers for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id,array['owner','editor']::public.workspace_role[])));
create policy audio_layers_update on public.audio_layers for update to authenticated
  using ((select private.has_workspace_role(workspace_id,array['owner','editor']::public.workspace_role[])))
  with check ((select private.has_workspace_role(workspace_id,array['owner','editor']::public.workspace_role[])));
create policy audio_layers_delete on public.audio_layers for delete to authenticated
  using ((select private.has_workspace_role(workspace_id,array['owner','editor']::public.workspace_role[])));
revoke all on public.audio_layers from anon;
grant select, insert, update, delete on public.audio_layers to authenticated;

update public.category_presets
set audio_rules = case slug
  when 'grandmas-tales' then '{"bgm":"very soft gayageum or warm acoustic drone","ambience":"fireplace, quiet hanok room, gentle evening insects","sfx":"page turn, teacup, soft wooden door","defaultBgmDb":-24,"defaultAmbienceDb":-28}'::jsonb
  when 'strange-tales' then '{"bgm":"sparse low gayageum, restrained mysterious drone","ambience":"night wind, distant rain, forest insects","sfx":"single knock, branch creak, distant bell","defaultBgmDb":-26,"defaultAmbienceDb":-27}'::jsonb
  when 'korean-legends' then '{"bgm":"restrained ceremonial Korean instruments and airy drone","ambience":"mountain wind, clouds, distant water","sfx":"temple bell, cloth movement, subtle thunder","defaultBgmDb":-23,"defaultAmbienceDb":-28}'::jsonb
  when 'stories-for-sleep' then '{"bgm":"optional near-silent warm drone with no melody changes","ambience":"steady rain, fireplace, soft wind","sfx":"avoid unless extremely soft and predictable","defaultBgmDb":-30,"defaultAmbienceDb":-24}'::jsonb
  when 'old-korean-wisdom' then '{"bgm":"minimal contemplative gayageum texture","ambience":"quiet room, courtyard birds, light breeze","sfx":"tea pour, brush on paper, single chime","defaultBgmDb":-26,"defaultAmbienceDb":-30}'::jsonb
  else audio_rules
end;
