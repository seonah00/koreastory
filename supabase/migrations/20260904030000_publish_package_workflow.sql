create table public.publish_package_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  episode_id uuid not null,
  render_version_id uuid not null,
  generation_id uuid,
  thumbnail_asset_id uuid,
  version integer not null check (version > 0),
  status public.approval_status not null default 'draft',
  content jsonb not null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (episode_id, version),
  unique (id, workspace_id),
  constraint publish_packages_episode_workspace_fkey
    foreign key (episode_id, workspace_id)
    references public.episodes(id, workspace_id) on delete cascade,
  constraint publish_packages_render_workspace_fkey
    foreign key (render_version_id, workspace_id)
    references public.render_versions(id, workspace_id),
  constraint publish_packages_generation_workspace_fkey
    foreign key (generation_id, workspace_id)
    references public.generations(id, workspace_id) on delete set null (generation_id),
  constraint publish_packages_thumbnail_workspace_fkey
    foreign key (thumbnail_asset_id, workspace_id)
    references public.assets(id, workspace_id) on delete set null (thumbnail_asset_id),
  check (jsonb_typeof(content -> 'titleOptions') = 'array'),
  check (jsonb_typeof(content -> 'chapters') = 'array')
);

create index publish_packages_workspace_idx
  on public.publish_package_versions(workspace_id);
create index publish_packages_episode_workspace_fkey_idx
  on public.publish_package_versions(episode_id, workspace_id);
create index publish_packages_render_workspace_fkey_idx
  on public.publish_package_versions(render_version_id, workspace_id);
create index publish_packages_generation_workspace_fkey_idx
  on public.publish_package_versions(generation_id, workspace_id)
  where generation_id is not null;
create index publish_packages_thumbnail_workspace_fkey_idx
  on public.publish_package_versions(thumbnail_asset_id, workspace_id)
  where thumbnail_asset_id is not null;

alter table public.publish_package_versions enable row level security;
create policy publish_packages_select on public.publish_package_versions
  for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy publish_packages_insert on public.publish_package_versions
  for insert to authenticated
  with check ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));
create policy publish_packages_update on public.publish_package_versions
  for update to authenticated
  using ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )))
  with check ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));
create policy publish_packages_delete on public.publish_package_versions
  for delete to authenticated
  using ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));
revoke all on public.publish_package_versions from anon;
grant select, insert, update, delete on public.publish_package_versions
  to authenticated;

create or replace function private.protect_publish_package()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'approved' then
    raise exception 'approved records are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.status = 'approved' then
    if nullif(trim(new.content ->> 'selectedTitle'), '') is null
      or new.thumbnail_asset_id is null
      or not exists (
        select 1 from public.assets a
        where a.id = new.thumbnail_asset_id
          and a.workspace_id = new.workspace_id
          and a.episode_id = new.episode_id
          and a.kind = 'image' and a.status = 'approved'
          and a.metadata ->> 'purpose' = 'youtube_thumbnail'
      ) then
      raise exception 'selected title and approved thumbnail required';
    end if;
    new.approved_at = coalesce(new.approved_at, now());
    new.approved_by = coalesce(new.approved_by, (select auth.uid()));
  end if;
  return new;
end;
$$;
revoke all on function private.protect_publish_package()
  from public, anon, authenticated;
create trigger publish_packages_immutable
before update or delete on public.publish_package_versions
for each row execute function private.protect_publish_package();

create or replace function public.create_publish_package_version(
  p_episode_id uuid,
  p_render_version_id uuid,
  p_generation_id uuid,
  p_content jsonb
)
returns table (publish_package_version_id uuid, version integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_version integer;
begin
  select e.workspace_id into v_workspace_id
  from public.episodes e
  join public.render_versions r
    on r.id = p_render_version_id
    and r.workspace_id = e.workspace_id
    and r.episode_id = e.id
  where e.id = p_episode_id
    and e.stage in ('ready', 'published')
    and r.status = 'approved'
    and r.output_asset_id is not null;
  if not found then raise exception 'ready episode and completed render required'; end if;

  if p_generation_id is not null and not exists (
    select 1 from public.generations g
    where g.id = p_generation_id and g.workspace_id = v_workspace_id
      and g.episode_id = p_episode_id
  ) then raise exception 'generation does not belong to episode'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_episode_id::text, 17));
  select coalesce(max(p.version), 0) + 1 into v_version
  from public.publish_package_versions p where p.episode_id = p_episode_id;

  return query
  insert into public.publish_package_versions (
    workspace_id, episode_id, render_version_id, generation_id, version, content
  ) values (
    v_workspace_id, p_episode_id, p_render_version_id, p_generation_id,
    v_version, p_content
  ) returning id, publish_package_versions.version;
end;
$$;
revoke all on function public.create_publish_package_version(
  uuid, uuid, uuid, jsonb
) from public, anon;
grant execute on function public.create_publish_package_version(
  uuid, uuid, uuid, jsonb
) to authenticated;
