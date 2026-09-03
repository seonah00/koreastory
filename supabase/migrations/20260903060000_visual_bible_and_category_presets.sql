create or replace function private.apply_category_visual_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visual_rules = '{}'::jsonb then
    new.visual_rules = case new.slug
      when 'grandmas-tales' then jsonb_build_object(
        'palette', 'cream, ochre, muted brown',
        'lighting', 'soft firelight and warm evening glow',
        'composition', 'comforting storybook framing with intimate medium shots',
        'atmosphere', 'warm, nostalgic, safe',
        'styleModifiers', 'soft edges, gentle expressions, cozy domestic details'
      )
      when 'strange-tales' then jsonb_build_object(
        'palette', 'deep indigo, ink black, cold silver',
        'lighting', 'restrained moonlight with soft shadow',
        'composition', 'mysterious negative space and distant silhouettes',
        'atmosphere', 'foggy, uncanny, quiet',
        'styleModifiers', 'mist, moon, subtle asymmetry, no graphic horror'
      )
      when 'korean-legends' then jsonb_build_object(
        'palette', 'jade, muted gold, restrained red',
        'lighting', 'luminous cloud light and ceremonial glow',
        'composition', 'layered mountains, clouds, and mythic wide shots',
        'atmosphere', 'majestic, ancient, emotionally expansive',
        'styleModifiers', 'mythic scale, Korean symbolic motifs, elegant detail'
      )
      when 'stories-for-sleep' then jsonb_build_object(
        'palette', 'desaturated navy, muted amber, soft gray',
        'lighting', 'dim lantern and diffused moonlight',
        'composition', 'generous quiet space with stable low-contrast framing',
        'atmosphere', 'cozy, rainy, deeply calm',
        'styleModifiers', 'soft focus, rain, slow visual rhythm, minimal detail'
      )
      when 'old-korean-wisdom' then jsonb_build_object(
        'palette', 'beige, ink, earth brown',
        'lighting', 'natural window light and restrained warm highlights',
        'composition', 'human expressions and simple reflective framing',
        'atmosphere', 'quiet, intimate, contemplative',
        'styleModifiers', 'subtle gesture, emotional restraint, uncluttered space'
      )
      else new.visual_rules
    end;
  end if;
  return new;
end;
$$;

revoke all on function private.apply_category_visual_defaults()
  from public, anon, authenticated;

create trigger category_presets_visual_defaults
before insert or update of slug, visual_rules on public.category_presets
for each row execute function private.apply_category_visual_defaults();

update public.category_presets
set visual_rules = '{}'
where visual_rules = '{}';

insert into public.bible_entries (
  workspace_id, kind, slug, name, version, status, content, approved_at, approved_by
)
select
  w.id,
  seed.kind,
  seed.slug,
  seed.name,
  1,
  'approved',
  seed.content,
  now(),
  w.created_by
from public.workspaces w
cross join lateral (
  values
    ('brand', 'k-lore-master-style', 'K-Lore Master Style', jsonb_build_object(
      'stylePrompt', 'Korean traditional folk-art inspired watercolor storybook illustration, handmade hanji paper texture, soft cinematic lighting, restrained colors',
      'negativePrompt', 'photorealism, glossy 3D, anime, modern objects, text, watermark, generic Chinese architecture, generic Japanese architecture',
      'consistencyRules', jsonb_build_array('same illustration medium', 'historically plausible Korean clothing', 'recognizable Korean architecture', 'low-stimulation composition')
    )),
    ('character', 'halmeoni', 'K-Lore Halmeoni', jsonb_build_object(
      'description', 'A warm Korean grandmother in her early seventies with a wise, gently playful expression',
      'face', 'soft oval face, natural age lines, kind dark-brown eyes',
      'hair', 'silver hair tied in a low traditional bun',
      'outfit', 'cream jeogori and muted jade chima with no ornate decoration',
      'props', jsonb_build_array('small celadon teacup', 'old storybook', 'brass oil lamp'),
      'personality', 'warm, restrained, wise, slightly playful',
      'referenceViews', jsonb_build_array('front', 'three-quarter', 'profile', 'storytelling', 'smiling', 'pouring tea')
    )),
    ('world', 'halmeoni-house', 'Halmeoni House', jsonb_build_object(
      'description', 'A recurring modest Joseon-era hanok room used to open and close every story',
      'interior', 'ondol room, wooden lattice window, low tea table, folded bedding, brass oil lamp, small brazier',
      'exterior', 'quiet tiled hanok beside a low stone wall and pine tree',
      'seasonalVariants', jsonb_build_object('spring', 'cherry blossom and spring rain', 'summer', 'open window, insects, moonlight', 'autumn', 'maple leaves, tea, dry wind', 'winter', 'snow, brazier, warm lamplight')
    )),
    ('voice', 'halmeoni-voice', 'Halmeoni Voice', jsonb_build_object(
      'speakingRate', 0.85,
      'tone', 'warm, calm, restrained',
      'paragraphPauseSeconds', 1.2,
      'bedtimeSoftness', 'high',
      'acting', 'natural with no exaggerated performance',
      'whisper', false
    ))
) as seed(kind, slug, name, content)
on conflict (workspace_id, kind, slug, version) do nothing;

create or replace function private.bootstrap_visual_bible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.bible_entries (
    workspace_id, kind, slug, name, version, status, content, approved_at, approved_by
  ) values
    (new.id, 'brand', 'k-lore-master-style', 'K-Lore Master Style', 1, 'approved', jsonb_build_object(
      'stylePrompt', 'Korean traditional folk-art inspired watercolor storybook illustration, handmade hanji paper texture, soft cinematic lighting, restrained colors',
      'negativePrompt', 'photorealism, glossy 3D, anime, modern objects, text, watermark, generic Chinese architecture, generic Japanese architecture',
      'consistencyRules', jsonb_build_array('same illustration medium', 'historically plausible Korean clothing', 'recognizable Korean architecture', 'low-stimulation composition')
    ), now(), new.created_by),
    (new.id, 'character', 'halmeoni', 'K-Lore Halmeoni', 1, 'approved', jsonb_build_object(
      'description', 'A warm Korean grandmother in her early seventies with a wise, gently playful expression',
      'face', 'soft oval face, natural age lines, kind dark-brown eyes',
      'hair', 'silver hair tied in a low traditional bun',
      'outfit', 'cream jeogori and muted jade chima with no ornate decoration',
      'props', jsonb_build_array('small celadon teacup', 'old storybook', 'brass oil lamp'),
      'personality', 'warm, restrained, wise, slightly playful',
      'referenceViews', jsonb_build_array('front', 'three-quarter', 'profile', 'storytelling', 'smiling', 'pouring tea')
    ), now(), new.created_by),
    (new.id, 'world', 'halmeoni-house', 'Halmeoni House', 1, 'approved', jsonb_build_object(
      'description', 'A recurring modest Joseon-era hanok room used to open and close every story',
      'interior', 'ondol room, wooden lattice window, low tea table, folded bedding, brass oil lamp, small brazier',
      'exterior', 'quiet tiled hanok beside a low stone wall and pine tree',
      'seasonalVariants', jsonb_build_object('spring', 'cherry blossom and spring rain', 'summer', 'open window, insects, moonlight', 'autumn', 'maple leaves, tea, dry wind', 'winter', 'snow, brazier, warm lamplight')
    ), now(), new.created_by),
    (new.id, 'voice', 'halmeoni-voice', 'Halmeoni Voice', 1, 'approved', jsonb_build_object(
      'speakingRate', 0.85, 'tone', 'warm, calm, restrained', 'paragraphPauseSeconds', 1.2,
      'bedtimeSoftness', 'high', 'acting', 'natural with no exaggerated performance', 'whisper', false
    ), now(), new.created_by);
  return new;
end;
$$;

revoke all on function private.bootstrap_visual_bible()
  from public, anon, authenticated;
create trigger workspaces_visual_bible_bootstrap
after insert on public.workspaces
for each row execute function private.bootstrap_visual_bible();

create or replace function public.create_bible_entry_version(
  p_workspace_id uuid,
  p_kind text,
  p_slug text,
  p_name text,
  p_content jsonb
)
returns table (bible_entry_id uuid, version integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version integer;
  v_id uuid;
begin
  if p_kind not in ('brand', 'character', 'world', 'style', 'voice') then
    raise exception 'unsupported bible entry kind';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid bible entry slug';
  end if;
  if nullif(trim(p_name), '') is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'name and JSON object content are required';
  end if;

  perform 1 from public.workspaces where id = p_workspace_id for update;
  if not found then raise exception 'workspace not found'; end if;

  select coalesce(max(b.version), 0) + 1 into v_version
  from public.bible_entries b
  where b.workspace_id = p_workspace_id
    and b.kind = p_kind
    and b.slug = p_slug;

  insert into public.bible_entries (
    workspace_id, kind, slug, name, version, content
  ) values (
    p_workspace_id, p_kind, p_slug, trim(p_name), v_version, p_content
  ) returning id into v_id;

  return query select v_id, v_version;
end;
$$;

revoke all on function public.create_bible_entry_version(uuid, text, text, text, jsonb)
  from public, anon;
grant execute on function public.create_bible_entry_version(uuid, text, text, text, jsonb)
  to authenticated;
