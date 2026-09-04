alter table public.assets
  add column render_version_id uuid,
  add constraint assets_render_version_workspace_fkey
    foreign key (render_version_id, workspace_id)
    references public.render_versions(id, workspace_id)
    on delete set null (render_version_id);

create index assets_render_version_workspace_fkey_idx
  on public.assets(render_version_id, workspace_id)
  where render_version_id is not null;

create unique index assets_render_subtitle_format_unique
  on public.assets(render_version_id, (metadata ->> 'format'))
  where render_version_id is not null and kind = 'subtitle';

update storage.buckets
set allowed_mime_types = array(
  select distinct mime
  from unnest(
    coalesce(allowed_mime_types, '{}'::text[]) ||
    array['text/vtt', 'application/x-subrip']
  ) as mime
)
where id = 'k-lore-assets';

create or replace function public.create_subtitle_exports(
  p_render_version_id uuid,
  p_vtt_path text,
  p_vtt_bytes bigint,
  p_vtt_checksum_sha256 text,
  p_srt_path text,
  p_srt_bytes bigint,
  p_srt_checksum_sha256 text
)
returns table (vtt_asset_id uuid, srt_asset_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_render public.render_versions%rowtype;
  v_prefix text;
  v_vtt_asset_id uuid;
  v_srt_asset_id uuid;
begin
  select * into v_render
  from public.render_versions
  where id = p_render_version_id
  for update;

  if not found or v_render.status <> 'approved'
    or v_render.output_asset_id is null then
    raise exception 'completed approved render required';
  end if;

  v_prefix := v_render.workspace_id::text || '/episodes/' ||
    v_render.episode_id::text || '/subtitles/' || v_render.id::text;
  if p_vtt_path <> v_prefix || '.vtt'
    or p_srt_path <> v_prefix || '.srt'
    or p_vtt_bytes <= 0 or p_srt_bytes <= 0
    or p_vtt_checksum_sha256 !~ '^[a-f0-9]{64}$'
    or p_srt_checksum_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid subtitle exports';
  end if;

  insert into public.assets (
    workspace_id, episode_id, render_version_id, kind, storage_bucket,
    storage_path, mime_type, bytes, checksum_sha256, metadata, status,
    approved_at, approved_by
  ) values
    (v_render.workspace_id, v_render.episode_id, v_render.id, 'subtitle',
      'k-lore-assets', p_vtt_path, 'text/vtt', p_vtt_bytes,
      p_vtt_checksum_sha256,
      jsonb_build_object('purpose', 'subtitle_export', 'format', 'vtt'),
      'approved', now(), (select auth.uid())),
    (v_render.workspace_id, v_render.episode_id, v_render.id, 'subtitle',
      'k-lore-assets', p_srt_path, 'application/x-subrip', p_srt_bytes,
      p_srt_checksum_sha256,
      jsonb_build_object('purpose', 'subtitle_export', 'format', 'srt'),
      'approved', now(), (select auth.uid()))
  on conflict do nothing;

  select a.id into v_vtt_asset_id
  from public.assets a
  where a.render_version_id = v_render.id and a.kind = 'subtitle'
    and a.metadata ->> 'format' = 'vtt'
  limit 1;
  select a.id into v_srt_asset_id
  from public.assets a
  where a.render_version_id = v_render.id and a.kind = 'subtitle'
    and a.metadata ->> 'format' = 'srt'
  limit 1;
  return query select v_vtt_asset_id, v_srt_asset_id;
end;
$$;

revoke all on function public.create_subtitle_exports(
  uuid, text, bigint, text, text, bigint, text
) from public, anon;
grant execute on function public.create_subtitle_exports(
  uuid, text, bigint, text, text, bigint, text
) to authenticated;

create or replace function public.mark_episode_ready(p_render_version_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_render public.render_versions%rowtype;
  v_subtitle_count integer;
begin
  select * into v_render
  from public.render_versions
  where id = p_render_version_id;
  if not found or v_render.status <> 'approved'
    or v_render.output_asset_id is null then
    raise exception 'completed approved render required';
  end if;

  select count(distinct a.metadata ->> 'format') into v_subtitle_count
  from public.assets a
  where a.render_version_id = v_render.id
    and a.kind = 'subtitle'
    and a.status = 'approved'
    and a.metadata ->> 'format' in ('vtt', 'srt');
  if v_subtitle_count <> 2 then
    raise exception 'vtt and srt exports required';
  end if;

  update public.episodes
  set stage = 'ready'
  where id = v_render.episode_id and workspace_id = v_render.workspace_id;
  return found;
end;
$$;

revoke all on function public.mark_episode_ready(uuid) from public, anon;
grant execute on function public.mark_episode_ready(uuid) to authenticated;
