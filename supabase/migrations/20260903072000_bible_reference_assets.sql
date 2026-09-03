alter table public.bible_entries
  add constraint bible_entries_id_workspace_unique unique (id, workspace_id);

alter table public.assets
  add constraint assets_id_workspace_unique unique (id, workspace_id);

alter table public.bible_references
  drop constraint bible_references_bible_entry_id_fkey,
  drop constraint bible_references_asset_id_fkey,
  alter column asset_id set not null,
  add constraint bible_references_entry_workspace_fkey
    foreign key (bible_entry_id, workspace_id)
    references public.bible_entries(id, workspace_id) on delete cascade,
  add constraint bible_references_asset_workspace_fkey
    foreign key (asset_id, workspace_id)
    references public.assets(id, workspace_id) on delete cascade,
  add constraint bible_references_entry_asset_unique
    unique (bible_entry_id, asset_id);

create index bible_references_entry_workspace_fkey_idx
  on public.bible_references(bible_entry_id, workspace_id);
create index bible_references_asset_workspace_fkey_idx
  on public.bible_references(asset_id, workspace_id);
