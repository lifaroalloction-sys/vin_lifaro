grant select on table public.categories, public.albums to anon;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories"
  on public.categories for select to anon using (true);

drop policy if exists "public read albums" on public.albums;
create policy "public read albums"
  on public.albums for select to anon using (true);

revoke execute on function public.email_allowed(text) from anon;