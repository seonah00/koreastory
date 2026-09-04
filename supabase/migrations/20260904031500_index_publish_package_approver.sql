create index publish_packages_approved_by_idx
  on public.publish_package_versions(approved_by)
  where approved_by is not null;
