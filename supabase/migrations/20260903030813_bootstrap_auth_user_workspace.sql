create or replace function private.bootstrap_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Storyteller'
  );
begin
  insert into public.profiles (id, display_name)
  values (new.id, profile_name);

  insert into public.workspaces (name, slug, created_by)
  values (
    profile_name || '''s K-Lore Studio',
    'k-lore-' || substr(replace(new.id::text, '-', ''), 1, 12),
    new.id
  );

  return new;
end;
$$;

revoke all on function private.bootstrap_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.bootstrap_auth_user();
