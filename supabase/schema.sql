-- Run in Supabase: SQL Editor > New query. Replace the admin email first.
create table admins (email text primary key);
create table viewers (email text primary key);
create table categories (id uuid primary key default gen_random_uuid(), name text not null, icon text not null default '📁', created_at timestamptz default now());
create table albums (id uuid primary key default gen_random_uuid(), category_id uuid not null references categories(id) on delete cascade, name text not null, created_at timestamptz default now());

alter table admins enable row level security;
alter table viewers enable row level security;
alter table categories enable row level security;
alter table albums enable row level security;

create function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from admins where email = lower(auth.jwt()->>'email')) $$;
create function is_member() returns boolean language sql stable security definer set search_path = public as
$$ select is_admin() or exists(select 1 from viewers where email = lower(auth.jwt()->>'email')) $$;
create function email_allowed(e text) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from admins where email = lower(e)) or exists(select 1 from viewers where email = lower(e)) $$;
grant execute on function email_allowed(text) to anon, authenticated;
grant execute on function is_admin(), is_member() to authenticated;

create policy "members read" on categories for select to authenticated using (is_member());
create policy "admin write" on categories for all to authenticated using (is_admin()) with check (is_admin());
create policy "members read" on albums for select to authenticated using (is_member());
create policy "admin write" on albums for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manage viewers" on viewers for all to authenticated using (is_admin()) with check (is_admin());

insert into admins values ('lifaro.alloction@gmail.com');
insert into categories (name, icon) values ('Trips','✈️'),('Dance','💃'),('Birthdays','🎂'),('Family','👨‍👩‍👧'),('Winning moments','🏆'),('Temples visited','🛕');
insert into albums (category_id, name) select id, unnest(array['Goa','Kerala']) from categories where name = 'Trips';
