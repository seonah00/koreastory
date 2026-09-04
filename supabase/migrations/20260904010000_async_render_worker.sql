alter table public.jobs
  add column render_version_id uuid,
  add column worker_id text,
  add column lease_expires_at timestamptz,
  add column heartbeat_at timestamptz,
  add column progress numeric(5,2) not null default 0
    check (progress between 0 and 100),
  add constraint jobs_render_version_workspace_fkey
    foreign key (render_version_id, workspace_id)
    references public.render_versions(id, workspace_id)
    on delete set null (render_version_id);

create index jobs_render_version_workspace_fkey_idx
  on public.jobs(render_version_id, workspace_id)
  where render_version_id is not null;
create index jobs_render_claim_idx
  on public.jobs(kind, status, lease_expires_at, created_at)
  where kind = 'render_mp4';

drop trigger render_versions_immutable on public.render_versions;

create or replace function private.protect_render_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'approved' then
    if tg_op = 'DELETE' then
      raise exception 'approved records are immutable';
    end if;
    if coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
      and old.output_asset_id is null
      and new.output_asset_id is not null
      and new.id = old.id
      and new.workspace_id = old.workspace_id
      and new.episode_id = old.episode_id
      and new.scene_plan_version_id = old.scene_plan_version_id
      and new.version = old.version
      and new.status = old.status
      and new.manifest = old.manifest
      and new.approved_at is not distinct from old.approved_at
      and new.approved_by is not distinct from old.approved_by
      and new.created_at = old.created_at then
      return new;
    end if;
    raise exception 'approved records are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.status = 'approved' then
    new.approved_at = coalesce(new.approved_at, now());
    new.approved_by = coalesce(new.approved_by, (select auth.uid()));
  end if;
  return new;
end;
$$;

revoke all on function private.protect_render_version()
  from public, anon, authenticated;

create trigger render_versions_immutable
before update or delete on public.render_versions
for each row execute function private.protect_render_version();

create or replace function public.enqueue_render_job(p_render_version_id uuid)
returns table (job_id uuid, status public.run_status)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_render public.render_versions%rowtype;
  v_job_id uuid;
  v_status public.run_status;
begin
  select * into v_render
  from public.render_versions
  where id = p_render_version_id
  for update;
  if not found or v_render.status <> 'approved' then
    raise exception 'approved render version required';
  end if;
  if v_render.output_asset_id is not null then
    raise exception 'render output already exists';
  end if;

  insert into public.jobs (
    workspace_id, episode_id, render_version_id, kind, status,
    idempotency_key, input, max_attempts
  ) values (
    v_render.workspace_id, v_render.episode_id, v_render.id, 'render_mp4',
    'pending', 'render-mp4:' || v_render.id::text,
    jsonb_build_object('renderVersionId', v_render.id), 3
  )
  on conflict (workspace_id, idempotency_key) do update
    set status = case when jobs.status = 'failed' then 'pending'::public.run_status
        else jobs.status end,
      attempt = case when jobs.status = 'failed' then 0 else jobs.attempt end,
      error = case when jobs.status = 'failed' then null else jobs.error end,
      completed_at = case when jobs.status = 'failed' then null else jobs.completed_at end,
      updated_at = now()
  returning id, jobs.status into v_job_id, v_status;

  return query select v_job_id, v_status;
end;
$$;

revoke all on function public.enqueue_render_job(uuid) from public, anon;
grant execute on function public.enqueue_render_job(uuid) to authenticated;

create or replace function public.claim_render_job(
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns table (
  job_id uuid,
  workspace_id uuid,
  episode_id uuid,
  render_version_id uuid,
  manifest jsonb,
  attempt integer
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(trim(p_worker_id), '') is null
    or p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception 'invalid worker lease';
  end if;

  return query
  with candidate as (
    select j.id
    from public.jobs j
    where j.kind = 'render_mp4'
      and j.attempt < j.max_attempts
      and (
        j.status = 'pending'
        or (j.status = 'running' and j.lease_expires_at < now())
      )
    order by j.created_at
    for update skip locked
    limit 1
  ), claimed as (
    update public.jobs j
    set status = 'running',
      worker_id = p_worker_id,
      attempt = j.attempt + 1,
      started_at = coalesce(j.started_at, now()),
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      progress = 0,
      error = null
    from candidate c
    where j.id = c.id
    returning j.*
  )
  select c.id, c.workspace_id, c.episode_id, c.render_version_id,
    rv.manifest, c.attempt
  from claimed c
  join public.render_versions rv on rv.id = c.render_version_id
  where rv.status = 'approved' and rv.output_asset_id is null;
end;
$$;

revoke all on function public.claim_render_job(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_render_job(text, integer)
  to service_role;

create or replace function public.heartbeat_render_job(
  p_job_id uuid,
  p_worker_id text,
  p_progress numeric,
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_updated integer;
begin
  update public.jobs
  set heartbeat_at = now(),
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    progress = greatest(0, least(100, p_progress)),
    updated_at = now()
  where id = p_job_id and worker_id = p_worker_id and status = 'running';
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.heartbeat_render_job(uuid, text, numeric, integer)
  from public, anon, authenticated;
grant execute on function public.heartbeat_render_job(uuid, text, numeric, integer)
  to service_role;

create or replace function public.complete_render_job(
  p_job_id uuid,
  p_worker_id text,
  p_storage_bucket text,
  p_storage_path text,
  p_bytes bigint,
  p_checksum_sha256 text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
  v_asset_id uuid;
begin
  select * into v_job from public.jobs
  where id = p_job_id and worker_id = p_worker_id and status = 'running'
  for update;
  if not found then raise exception 'active render job not found'; end if;
  if p_storage_bucket <> 'k-lore-assets'
    or p_storage_path not like v_job.workspace_id::text || '/episodes/' ||
      v_job.episode_id::text || '/renders/%'
    or p_bytes <= 0
    or p_checksum_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid render output';
  end if;

  insert into public.assets (
    workspace_id, episode_id, kind, storage_bucket, storage_path,
    mime_type, bytes, checksum_sha256, metadata, status, approved_at
  ) values (
    v_job.workspace_id, v_job.episode_id, 'video', p_storage_bucket,
    p_storage_path, 'video/mp4', p_bytes, p_checksum_sha256,
    jsonb_build_object('purpose', 'render_output', 'renderVersionId',
      v_job.render_version_id) || coalesce(p_metadata, '{}'::jsonb),
    'approved', now()
  ) returning id into v_asset_id;

  update public.render_versions
  set output_asset_id = v_asset_id
  where id = v_job.render_version_id and output_asset_id is null;
  if not found then raise exception 'render output could not be attached'; end if;

  update public.jobs
  set status = 'succeeded', progress = 100,
    output = jsonb_build_object('assetId', v_asset_id),
    completed_at = now(), lease_expires_at = null, updated_at = now()
  where id = v_job.id;
  update public.episodes set stage = 'review' where id = v_job.episode_id;
  return v_asset_id;
end;
$$;

revoke all on function public.complete_render_job(uuid, text, text, text, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_render_job(uuid, text, text, text, bigint, text, jsonb)
  to service_role;

create or replace function public.fail_render_job(
  p_job_id uuid,
  p_worker_id text,
  p_error jsonb
)
returns public.run_status
language plpgsql
security invoker
set search_path = ''
as $$
declare v_status public.run_status;
begin
  update public.jobs
  set status = case when attempt < max_attempts then 'pending'::public.run_status
    else 'failed'::public.run_status end,
    error = coalesce(p_error, jsonb_build_object('message', 'render failed')),
    worker_id = null, lease_expires_at = null, heartbeat_at = now(),
    completed_at = case when attempt >= max_attempts then now() else null end,
    updated_at = now()
  where id = p_job_id and worker_id = p_worker_id and status = 'running'
  returning status into v_status;
  if not found then raise exception 'active render job not found'; end if;
  return v_status;
end;
$$;

revoke all on function public.fail_render_job(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fail_render_job(uuid, text, jsonb)
  to service_role;
