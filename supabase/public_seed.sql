insert into public.categories (name, icon)
select seed.name, seed.icon
from (values
  ('Trips', '✈️'),
  ('Dance', '💃'),
  ('Birthdays', '🎂'),
  ('Family', '👨‍👩‍👧'),
  ('Winning moments', '🏆'),
  ('Temples visited', '🛕')
) as seed(name, icon)
where not exists (
  select 1 from public.categories existing where existing.name = seed.name
);

insert into public.albums (category_id, name)
select category.id, seed.name
from public.categories category
cross join (values ('Goa'), ('Kerala')) as seed(name)
where category.name = 'Trips'
  and not exists (
    select 1 from public.albums existing
    where existing.category_id = category.id and existing.name = seed.name
  );