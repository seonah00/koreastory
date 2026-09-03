create index audio_layers_episode_workspace_fkey_idx
  on public.audio_layers(episode_id, workspace_id);

create index audio_layers_approved_by_fkey_idx
  on public.audio_layers(approved_by)
  where approved_by is not null;

create or replace function private.apply_category_audio_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.audio_rules = '{}'::jsonb then
    new.audio_rules = case new.slug
      when 'grandmas-tales' then '{"bgm":"very soft gayageum or warm acoustic drone","ambience":"fireplace, quiet hanok room, gentle evening insects","sfx":"page turn, teacup, soft wooden door","defaultBgmDb":-24,"defaultAmbienceDb":-28}'::jsonb
      when 'strange-tales' then '{"bgm":"sparse low gayageum, restrained mysterious drone","ambience":"night wind, distant rain, forest insects","sfx":"single knock, branch creak, distant bell","defaultBgmDb":-26,"defaultAmbienceDb":-27}'::jsonb
      when 'korean-legends' then '{"bgm":"restrained ceremonial Korean instruments and airy drone","ambience":"mountain wind, clouds, distant water","sfx":"temple bell, cloth movement, subtle thunder","defaultBgmDb":-23,"defaultAmbienceDb":-28}'::jsonb
      when 'stories-for-sleep' then '{"bgm":"optional near-silent warm drone with no melody changes","ambience":"steady rain, fireplace, soft wind","sfx":"avoid unless extremely soft and predictable","defaultBgmDb":-30,"defaultAmbienceDb":-24}'::jsonb
      when 'old-korean-wisdom' then '{"bgm":"minimal contemplative gayageum texture","ambience":"quiet room, courtyard birds, light breeze","sfx":"tea pour, brush on paper, single chime","defaultBgmDb":-26,"defaultAmbienceDb":-30}'::jsonb
      else new.audio_rules
    end;
  end if;
  return new;
end;
$$;

revoke all on function private.apply_category_audio_defaults()
  from public, anon, authenticated;

create trigger category_presets_audio_defaults
before insert or update of slug, audio_rules on public.category_presets
for each row execute function private.apply_category_audio_defaults();

update public.category_presets
set audio_rules = '{}'
where audio_rules = '{}';
