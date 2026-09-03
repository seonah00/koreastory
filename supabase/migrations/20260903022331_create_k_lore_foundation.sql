create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.workspace_role as enum ('owner', 'editor', 'viewer');
create type public.production_stage as enum ('idea','research','brief','script','scenes','visuals','audio','render','review','ready','published','archived');
create type public.approval_status as enum ('draft', 'approved', 'rejected');
create type public.run_status as enum ('pending', 'running', 'paused', 'succeeded', 'failed', 'cancelled');
create type public.asset_kind as enum ('image', 'audio', 'video', 'subtitle', 'document', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'), created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.workspace_role not null default 'viewer',
  created_at timestamptz not null default now(), primary key (workspace_id, user_id)
);
create table public.category_presets (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null, name text not null, discovery_rules jsonb not null default '{}', scoring_weights jsonb not null default '{}',
  script_rules jsonb not null default '{}', visual_rules jsonb not null default '{}', audio_rules jsonb not null default '{}',
  title_rules jsonb not null default '{}', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workspace_id, slug)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.episodes (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null, category_preset_id uuid references public.category_presets(id) on delete set null,
  working_title text not null, stage public.production_stage not null default 'idea', target_duration_seconds integer check (target_duration_seconds > 0),
  published_url text, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.story_ideas (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null, category_preset_id uuid references public.category_presets(id) on delete set null,
  title text not null, source_kind text not null default 'folklore', synopsis text, scores jsonb not null default '{}', rationale text,
  duplicate_of uuid references public.story_ideas(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.source_documents (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  story_idea_id uuid references public.story_ideas(id) on delete cascade, title text not null, source_url text, publisher text,
  published_at date, retrieved_at timestamptz not null default now(), content_excerpt text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.research_evidence (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, source_document_id uuid not null references public.source_documents(id) on delete cascade,
  claim text not null, evidence_excerpt text, confidence numeric(4,3) check (confidence between 0 and 1), created_at timestamptz not null default now()
);
create table public.story_brief_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, version integer not null check (version > 0),
  status public.approval_status not null default 'draft', content jsonb not null, approved_at timestamptz, approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(), unique (episode_id, version)
);
create table public.script_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, story_brief_version_id uuid not null references public.story_brief_versions(id),
  version integer not null check (version > 0), status public.approval_status not null default 'draft', language_code text not null default 'en',
  title text, full_text text not null default '', approved_at timestamptz, approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(), unique (episode_id, version)
);
create table public.script_segments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  script_version_id uuid not null references public.script_versions(id) on delete cascade, position integer not null check (position >= 0),
  narration text not null, emotion text, estimated_duration_ms integer check (estimated_duration_ms >= 0), metadata jsonb not null default '{}',
  unique (script_version_id, position)
);
create table public.scene_plan_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, script_version_id uuid not null references public.script_versions(id),
  version integer not null check (version > 0), status public.approval_status not null default 'draft', approved_at timestamptz,
  approved_by uuid references auth.users(id), created_at timestamptz not null default now(), unique (episode_id, version)
);
create table public.scenes (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  scene_plan_version_id uuid not null references public.scene_plan_versions(id) on delete cascade, position integer not null check (position >= 0),
  title text, description text not null, visual_prompt text, negative_prompt text, camera_motion text, ambience text,
  duration_ms integer check (duration_ms > 0), metadata jsonb not null default '{}', unique (scene_plan_version_id, position)
);
create table public.scene_segments (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, scene_id uuid not null references public.scenes(id) on delete cascade,
  script_segment_id uuid not null references public.script_segments(id) on delete cascade, position integer not null default 0 check (position >= 0),
  primary key (scene_id, script_segment_id)
);
create table public.bible_entries (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('brand','character','world','style','voice')), slug text not null, name text not null,
  version integer not null default 1 check (version > 0), status public.approval_status not null default 'draft', content jsonb not null default '{}',
  approved_at timestamptz, approved_by uuid references auth.users(id), created_at timestamptz not null default now(), unique (workspace_id, kind, slug, version)
);
create table public.assets (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null, kind public.asset_kind not null, storage_bucket text not null default 'k-lore-assets',
  storage_path text not null, mime_type text, bytes bigint check (bytes >= 0), checksum_sha256 text,
  status public.approval_status not null default 'draft', metadata jsonb not null default '{}', approved_at timestamptz,
  approved_by uuid references auth.users(id), created_at timestamptz not null default now(), unique (storage_bucket, storage_path),
  check (storage_path like workspace_id::text || '/%')
);
create table public.bible_references (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bible_entry_id uuid not null references public.bible_entries(id) on delete cascade, asset_id uuid references public.assets(id) on delete set null,
  label text, position integer not null default 0, created_at timestamptz not null default now()
);
create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  purpose text not null, name text not null, version integer not null check (version > 0), template text not null,
  variables_schema jsonb not null default '{}', created_at timestamptz not null default now(), unique (workspace_id, purpose, name, version)
);
create table public.generations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null, prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  parent_generation_id uuid references public.generations(id) on delete set null, provider text not null, model text not null, kind text not null,
  status public.run_status not null default 'pending', request jsonb not null default '{}', response jsonb, error jsonb,
  input_tokens integer check (input_tokens >= 0), output_tokens integer check (output_tokens >= 0), cost_usd numeric(12,6) check (cost_usd >= 0),
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null, kind text not null, status public.run_status not null default 'pending',
  idempotency_key text not null, input jsonb not null default '{}', output jsonb, error jsonb, attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0), started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workspace_id, idempotency_key)
);
create table public.job_steps (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade, position integer not null check (position >= 0), name text not null,
  status public.run_status not null default 'pending', generation_id uuid references public.generations(id) on delete set null,
  input jsonb not null default '{}', output jsonb, error jsonb, started_at timestamptz, completed_at timestamptz, unique (job_id, position)
);
create table public.render_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, scene_plan_version_id uuid not null references public.scene_plan_versions(id),
  version integer not null check (version > 0), status public.approval_status not null default 'draft', manifest jsonb not null,
  output_asset_id uuid references public.assets(id) on delete set null, approved_at timestamptz, approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(), unique (episode_id, version)
);

create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);
create index episodes_workspace_stage_idx on public.episodes(workspace_id, stage);
create index generations_workspace_status_idx on public.generations(workspace_id, status);
create index jobs_workspace_status_idx on public.jobs(workspace_id, status);
do $$ declare t text; begin foreach t in array array['category_presets','projects','story_ideas','source_documents','research_evidence','story_brief_versions','script_versions','script_segments','scene_plan_versions','scenes','scene_segments','bible_entries','bible_references','assets','prompt_versions','job_steps','render_versions'] loop execute format('create index %I on public.%I(workspace_id)', t || '_workspace_idx', t); end loop; end $$;

create function private.is_workspace_member(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members where workspace_id = target and user_id = (select auth.uid()));
$$;
create function private.has_workspace_role(target uuid, roles public.workspace_role[]) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members where workspace_id = target and user_id = (select auth.uid()) and role = any(roles));
$$;
create function private.is_workspace_member_path(path text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members where workspace_id::text = path and user_id = (select auth.uid()));
$$;
revoke all on function private.is_workspace_member(uuid), private.has_workspace_role(uuid, public.workspace_role[]), private.is_workspace_member_path(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid), private.has_workspace_role(uuid, public.workspace_role[]), private.is_workspace_member_path(text) to authenticated;

create function private.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create function private.protect_approved_record() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'approved' then raise exception 'approved records are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.status = 'approved' then new.approved_at = coalesce(new.approved_at, now()); new.approved_by = coalesce(new.approved_by, (select auth.uid())); end if;
  return new;
end $$;
create function private.protect_approved_script_child() returns trigger language plpgsql set search_path = '' as $$
declare parent_id uuid := case when tg_op = 'DELETE' then old.script_version_id else new.script_version_id end;
begin
  if exists(select 1 from public.script_versions where id=parent_id and status='approved') then
    raise exception 'segments of an approved script are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create function private.protect_approved_scene() returns trigger language plpgsql set search_path = '' as $$
declare parent_id uuid := case when tg_op = 'DELETE' then old.scene_plan_version_id else new.scene_plan_version_id end;
begin
  if exists(select 1 from public.scene_plan_versions where id=parent_id and status='approved') then
    raise exception 'scenes of an approved plan are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create function private.protect_approved_scene_segment() returns trigger language plpgsql set search_path = '' as $$
declare target_scene uuid := case when tg_op = 'DELETE' then old.scene_id else new.scene_id end;
begin
  if exists(select 1 from public.scenes s join public.scene_plan_versions p on p.id=s.scene_plan_version_id where s.id=target_scene and p.status='approved') then
    raise exception 'segment mappings of an approved scene plan are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create function private.bootstrap_workspace() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workspace_members(workspace_id,user_id,role) values(new.id,new.created_by,'owner');
  insert into public.category_presets(workspace_id,slug,name,scoring_weights) values
  (new.id,'grandmas-tales','Grandma''s Tales','{"warmth":30,"globalAppeal":25,"familyFriendly":20,"visual":15,"sleep":10}'),
  (new.id,'strange-tales','Strange Korean Tales','{"ctr":25,"uniqueness":25,"story":20,"visual":15,"globalAppeal":15}'),
  (new.id,'korean-legends','Korean Legends','{"culturalUniqueness":30,"storyDepth":25,"visual":20,"globalAppeal":15,"series":10}'),
  (new.id,'stories-for-sleep','Stories for Sleep','{"sleep":35,"cozy":25,"ambient":20,"visual":10,"story":10}'),
  (new.id,'old-korean-wisdom','Old Korean Wisdom','{"relevance":30,"emotionalDepth":25,"lesson":20,"globalAppeal":15,"visual":10}');
  return new;
end $$;
revoke all on function private.bootstrap_workspace() from public, anon, authenticated;
create trigger workspaces_bootstrap after insert on public.workspaces for each row execute function private.bootstrap_workspace();
do $$ declare t text; begin foreach t in array array['profiles','workspaces','category_presets','projects','episodes','story_ideas','jobs'] loop execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', t || '_updated_at', t); end loop; end $$;
do $$ declare t text; begin foreach t in array array['story_brief_versions','script_versions','scene_plan_versions','bible_entries','assets','render_versions'] loop execute format('create trigger %I before update or delete on public.%I for each row execute function private.protect_approved_record()', t || '_immutable', t); end loop; end $$;
create trigger script_segments_immutable before insert or update or delete on public.script_segments for each row execute function private.protect_approved_script_child();
create trigger scenes_immutable before insert or update or delete on public.scenes for each row execute function private.protect_approved_scene();
create trigger scene_segments_immutable before insert or update or delete on public.scene_segments for each row execute function private.protect_approved_scene_segment();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
create policy profiles_select on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy workspaces_select on public.workspaces for select to authenticated using ((select private.is_workspace_member(id)));
create policy workspaces_insert on public.workspaces for insert to authenticated with check (created_by=(select auth.uid()));
create policy workspaces_update on public.workspaces for update to authenticated using ((select private.has_workspace_role(id,array['owner']::public.workspace_role[]))) with check ((select private.has_workspace_role(id,array['owner']::public.workspace_role[])));
create policy workspaces_delete on public.workspaces for delete to authenticated using ((select private.has_workspace_role(id,array['owner']::public.workspace_role[])));
create policy workspace_members_select on public.workspace_members for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy workspace_members_insert on public.workspace_members for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array['owner']::public.workspace_role[])));
create policy workspace_members_update on public.workspace_members for update to authenticated using ((select private.has_workspace_role(workspace_id,array['owner']::public.workspace_role[]))) with check ((select private.has_workspace_role(workspace_id,array['owner']::public.workspace_role[])));
create policy workspace_members_delete on public.workspace_members for delete to authenticated using ((select private.has_workspace_role(workspace_id,array['owner']::public.workspace_role[])));
do $$ declare t text; begin foreach t in array array['category_presets','projects','episodes','story_ideas','source_documents','research_evidence','story_brief_versions','script_versions','script_segments','scene_plan_versions','scenes','scene_segments','bible_entries','bible_references','assets','prompt_versions','generations','jobs','job_steps','render_versions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy %I on public.%I for select to authenticated using ((select private.is_workspace_member(workspace_id)))',t||'_select',t);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array[''owner'',''editor'']::public.workspace_role[])))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using ((select private.has_workspace_role(workspace_id,array[''owner'',''editor'']::public.workspace_role[]))) with check ((select private.has_workspace_role(workspace_id,array[''owner'',''editor'']::public.workspace_role[])))',t||'_update',t);
  execute format('create policy %I on public.%I for delete to authenticated using ((select private.has_workspace_role(workspace_id,array[''owner'',''editor'']::public.workspace_role[])))',t||'_delete',t);
end loop; end $$;
revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('k-lore-assets','k-lore-assets',false,104857600,array['image/png','image/jpeg','image/webp','audio/mpeg','audio/wav','video/mp4','text/vtt','application/json'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy storage_assets_select on storage.objects for select to authenticated using (bucket_id='k-lore-assets' and (select private.is_workspace_member_path((storage.foldername(name))[1])));
create policy storage_assets_insert on storage.objects for insert to authenticated with check (bucket_id='k-lore-assets' and (select private.has_workspace_role(case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid end,array['owner','editor']::public.workspace_role[])));
create policy storage_assets_update on storage.objects for update to authenticated using (bucket_id='k-lore-assets' and (select private.is_workspace_member_path((storage.foldername(name))[1]))) with check (bucket_id='k-lore-assets' and (select private.has_workspace_role(case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid end,array['owner','editor']::public.workspace_role[])));
create policy storage_assets_delete on storage.objects for delete to authenticated using (bucket_id='k-lore-assets' and (select private.has_workspace_role(case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid end,array['owner','editor']::public.workspace_role[])));
