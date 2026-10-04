create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  file_name text not null,
  description text not null default '',
  taken_on date,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  created_at timestamptz not null default now()
);

alter table public.albums add column if not exists icon text not null default '📁';
alter table public.media add column if not exists description text not null default '';
alter table public.media add column if not exists taken_on date;

create index if not exists media_album_created_idx on public.media (album_id, created_at desc);
alter table public.media enable row level security;

grant select on public.categories, public.albums, public.media to anon, authenticated;
grant insert, update, delete on public.categories, public.albums, public.media to authenticated;

drop policy if exists "public read media" on public.media;
create policy "public read media" on public.media
  for select to anon using (true);

drop policy if exists "admin manage media" on public.media;
create policy "admin manage media" on public.media
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', true, 52428800, array['image/*', 'video/*'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read memory files" on storage.objects;
create policy "public read memory files" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'memories');

drop policy if exists "admin upload memory files" on storage.objects;
create policy "admin upload memory files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memories' and public.is_admin());

drop policy if exists "admin delete memory files" on storage.objects;
create policy "admin delete memory files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memories' and public.is_admin());