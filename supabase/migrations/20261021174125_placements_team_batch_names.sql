-- Top placements: admins mark highly placed students; package is optional and public when filled in.
alter table public.students
  add column is_featured boolean not null default false,
  add column package text;

-- HOPE team on the public site: admins choose who appears and in what order.
alter table public.admins
  add column show_on_site boolean not null default true,
  add column sort_order int not null default 0;

-- Public read of the team exposing only name, designation and photo (email and phone stay admin-only).
-- SECURITY DEFINER is intentional: it is the only public window onto the admins table.
create or replace function public.get_team()
returns table (id uuid, full_name text, designation text, photo_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.full_name, a.designation, a.photo_path
  from public.admins a
  where a.show_on_site
  order by a.sort_order, a.full_name;
$$;
revoke all on function public.get_team() from public;
grant execute on function public.get_team() to anon, authenticated;

-- Batch names as used by the college
update public.batches set name = 'HOPE Elite', sort_order = 1 where slug = 'elite';
update public.batches set name = 'HOPE Batch 2', sort_order = 2 where slug = 'batch-2';

-- Applied separately on 2026-10-21 (data, not schema): Batch 3 and the RLS test student were
-- unpublished rather than deleted. Delete them from the admin area when convenient.
