-- HOPE core schema: public content tables, admin-only private tables, RLS.
-- Applied to project lnzpkbazdutogwwhasix on 2026-10-21. Keep this file in sync with the database.
-- Admin check lives in a schema that is not exposed through the Data API.
create schema if not exists private;

-- ---------- Admins (admin-only) ----------
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  designation text,
  photo_path text,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where id = (select auth.uid()));
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

-- ---------- Batches (public) ----------
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  starts_on date,
  ends_on date,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Students: public fields ----------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.batches(id) on delete set null,
  full_name text not null,
  photo_path text,
  employment text check (employment in ('placed', 'working')),
  company text,
  is_alumni boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index students_batch_id_idx on public.students (batch_id);

-- ---------- Students: private fields (admin-only) ----------
create table public.student_private (
  student_id uuid primary key references public.students(id) on delete cascade,
  roll_no text,
  email text,
  phone text,
  department text,
  year_of_study text,
  job_role text,
  linkedin_url text,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------- Mentors (public; assigned by the college, managed by admins) ----------
create table public.mentors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  department text,
  teaches text[] not null default '{}',
  photo_path text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Events (public) ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  summary text,
  description text,
  poster_path text,
  register_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index events_starts_at_idx on public.events (starts_at);

-- ---------- Site photos for design slots (gallery, tracks, lab, ...) ----------
create table public.site_media (
  slot text primary key,
  path text not null,
  updated_at timestamptz not null default now()
);

-- ---------- Grants (Data API reachability; RLS decides rows) ----------
grant select on public.batches, public.students, public.mentors, public.events, public.site_media to anon, authenticated;
grant insert, update, delete on public.batches, public.students, public.mentors, public.events, public.site_media to authenticated;
grant select, insert, update, delete on public.student_private, public.admins to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

-- ---------- Row Level Security ----------
alter table public.admins enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.student_private enable row level security;
alter table public.mentors enable row level security;
alter table public.events enable row level security;
alter table public.site_media enable row level security;

-- Public content: anyone reads published rows; admins read everything and write
create policy "Read published batches" on public.batches for select to anon, authenticated
  using (is_published or (select private.is_admin()));
create policy "Admins manage batches" on public.batches for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Read published students" on public.students for select to anon, authenticated
  using (is_published or (select private.is_admin()));
create policy "Admins manage students" on public.students for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Read published mentors" on public.mentors for select to anon, authenticated
  using (is_published or (select private.is_admin()));
create policy "Admins manage mentors" on public.mentors for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Read published events" on public.events for select to anon, authenticated
  using (is_published or (select private.is_admin()));
create policy "Admins manage events" on public.events for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Read site media" on public.site_media for select to anon, authenticated
  using (true);
create policy "Admins manage site media" on public.site_media for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Admin-only data
create policy "Admins manage student private data" on public.student_private for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage admins" on public.admins for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------- Photo storage: public read, admin-only writes ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

create policy "Admins read media objects" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));
create policy "Admins upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select private.is_admin()));
create policy "Admins update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select private.is_admin()))
  with check (bucket_id = 'media' and (select private.is_admin()));
create policy "Admins delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));

-- ---------- Starting batches ----------
insert into public.batches (slug, name, sort_order) values
  ('elite', 'Elite', 1),
  ('batch-2', 'Batch 2', 2),
  ('batch-3', 'Batch 3', 3);
