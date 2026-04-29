-- Public photos bucket for bingo evidence + photo wall.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

-- Code ZIPs bucket for project submissions. Public so mentors can browse/download.
insert into storage.buckets (id, name, public) values ('code-zips', 'code-zips', true)
  on conflict (id) do nothing;

-- Storage policies: allow anon SELECT and INSERT on both buckets.
create policy "anon_read_photos" on storage.objects for select
  using (bucket_id in ('photos', 'code-zips'));

create policy "anon_upload_photos" on storage.objects for insert
  with check (bucket_id in ('photos', 'code-zips'));
