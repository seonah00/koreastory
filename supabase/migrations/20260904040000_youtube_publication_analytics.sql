create table public.youtube_publications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  episode_id uuid not null,
  publish_package_version_id uuid not null,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  video_url text not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id),
  unique (video_id),
  unique (id, workspace_id),
  check (video_url = 'https://www.youtube.com/watch?v=' || video_id),
  constraint youtube_publications_episode_workspace_fkey
    foreign key (episode_id, workspace_id)
    references public.episodes(id, workspace_id) on delete cascade,
  constraint youtube_publications_package_workspace_fkey
    foreign key (publish_package_version_id, workspace_id)
    references public.publish_package_versions(id, workspace_id)
);

create table public.youtube_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  publication_id uuid not null,
  captured_at timestamptz not null,
  views bigint not null check (views >= 0),
  impressions bigint not null check (impressions >= 0),
  click_through_rate numeric(7,4) not null check (click_through_rate between 0 and 100),
  average_view_duration_seconds integer not null check (average_view_duration_seconds >= 0),
  average_percentage_viewed numeric(7,4) not null check (average_percentage_viewed between 0 and 100),
  likes bigint not null default 0 check (likes >= 0),
  comments bigint not null default 0 check (comments >= 0),
  subscribers_gained bigint not null default 0 check (subscribers_gained >= 0),
  created_at timestamptz not null default now(),
  unique (publication_id, captured_at),
  constraint youtube_metrics_publication_workspace_fkey
    foreign key (publication_id, workspace_id)
    references public.youtube_publications(id, workspace_id) on delete cascade
);

create index youtube_publications_workspace_published_idx
  on public.youtube_publications(workspace_id, published_at desc);
create index youtube_publications_package_workspace_fkey_idx
  on public.youtube_publications(publish_package_version_id, workspace_id);
create index youtube_metrics_workspace_captured_idx
  on public.youtube_metric_snapshots(workspace_id, captured_at desc);
create index youtube_metrics_publication_workspace_fkey_idx
  on public.youtube_metric_snapshots(publication_id, workspace_id);

alter table public.youtube_publications enable row level security;
alter table public.youtube_metric_snapshots enable row level security;

create policy youtube_publications_select on public.youtube_publications
  for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy youtube_publications_insert on public.youtube_publications
  for insert to authenticated
  with check ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));
create policy youtube_publications_update on public.youtube_publications
  for update to authenticated
  using ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )))
  with check ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));
create policy youtube_publications_delete on public.youtube_publications
  for delete to authenticated
  using ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));

create policy youtube_metrics_select on public.youtube_metric_snapshots
  for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy youtube_metrics_insert on public.youtube_metric_snapshots
  for insert to authenticated
  with check ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));
create policy youtube_metrics_update on public.youtube_metric_snapshots
  for update to authenticated
  using ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )))
  with check ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));
create policy youtube_metrics_delete on public.youtube_metric_snapshots
  for delete to authenticated
  using ((select private.has_workspace_role(
    workspace_id, array['owner','editor']::public.workspace_role[]
  )));

revoke all on public.youtube_publications, public.youtube_metric_snapshots from anon;
grant select, insert, update, delete
  on public.youtube_publications, public.youtube_metric_snapshots
  to authenticated;

create or replace function private.protect_youtube_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.publish_package_versions p
    where p.id = new.publish_package_version_id
      and p.workspace_id = new.workspace_id
      and p.episode_id = new.episode_id
      and p.status = 'approved'
  ) then
    raise exception 'approved publish package for episode required';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.protect_youtube_publication()
  from public, anon, authenticated;
create trigger youtube_publications_validate
before insert or update on public.youtube_publications
for each row execute function private.protect_youtube_publication();

create or replace function public.record_youtube_publication(
  p_publish_package_version_id uuid,
  p_video_id text,
  p_video_url text,
  p_published_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_package public.publish_package_versions%rowtype;
  v_publication_id uuid;
begin
  select * into v_package
  from public.publish_package_versions
  where id = p_publish_package_version_id and status = 'approved';
  if not found then raise exception 'approved publish package required'; end if;

  insert into public.youtube_publications (
    workspace_id, episode_id, publish_package_version_id,
    video_id, video_url, published_at
  ) values (
    v_package.workspace_id, v_package.episode_id, v_package.id,
    p_video_id, p_video_url, p_published_at
  )
  on conflict (episode_id) do update set
    publish_package_version_id = excluded.publish_package_version_id,
    video_id = excluded.video_id,
    video_url = excluded.video_url,
    published_at = excluded.published_at,
    updated_at = now()
  returning id into v_publication_id;

  update public.episodes set
    stage = 'published', published_url = p_video_url,
    published_at = p_published_at, updated_at = now()
  where id = v_package.episode_id and workspace_id = v_package.workspace_id;
  return v_publication_id;
end;
$$;

create or replace function public.record_youtube_metric_snapshot(
  p_publication_id uuid,
  p_captured_at timestamptz,
  p_views bigint,
  p_impressions bigint,
  p_click_through_rate numeric,
  p_average_view_duration_seconds integer,
  p_average_percentage_viewed numeric,
  p_likes bigint,
  p_comments bigint,
  p_subscribers_gained bigint
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_publication public.youtube_publications%rowtype;
  v_snapshot_id uuid;
begin
  select * into v_publication from public.youtube_publications
  where id = p_publication_id;
  if not found then raise exception 'publication not found'; end if;
  if p_captured_at < v_publication.published_at then
    raise exception 'metrics cannot predate publication';
  end if;

  insert into public.youtube_metric_snapshots (
    workspace_id, publication_id, captured_at, views, impressions,
    click_through_rate, average_view_duration_seconds,
    average_percentage_viewed, likes, comments, subscribers_gained
  ) values (
    v_publication.workspace_id, v_publication.id, p_captured_at, p_views,
    p_impressions, p_click_through_rate, p_average_view_duration_seconds,
    p_average_percentage_viewed, p_likes, p_comments, p_subscribers_gained
  )
  on conflict (publication_id, captured_at) do update set
    views = excluded.views, impressions = excluded.impressions,
    click_through_rate = excluded.click_through_rate,
    average_view_duration_seconds = excluded.average_view_duration_seconds,
    average_percentage_viewed = excluded.average_percentage_viewed,
    likes = excluded.likes, comments = excluded.comments,
    subscribers_gained = excluded.subscribers_gained
  returning id into v_snapshot_id;
  return v_snapshot_id;
end;
$$;

revoke all on function public.record_youtube_publication(uuid, text, text, timestamptz)
  from public, anon;
grant execute on function public.record_youtube_publication(uuid, text, text, timestamptz)
  to authenticated;
revoke all on function public.record_youtube_metric_snapshot(
  uuid, timestamptz, bigint, bigint, numeric, integer, numeric, bigint, bigint, bigint
) from public, anon;
grant execute on function public.record_youtube_metric_snapshot(
  uuid, timestamptz, bigint, bigint, numeric, integer, numeric, bigint, bigint, bigint
) to authenticated;
