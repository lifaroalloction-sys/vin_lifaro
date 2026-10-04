begin;

delete from public.admins
where lower(email) = 'lifaro.alloction@gmail.com';

insert into public.admins (email)
values ('vinothkumar6381650856@gmail.com')
on conflict (email) do nothing;

commit;