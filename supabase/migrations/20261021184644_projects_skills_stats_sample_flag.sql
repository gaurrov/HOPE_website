-- Public achievement info on students (contact details stay in student_private)
alter table public.students
  add column skills text[] not null default '{}',
  add column certifications text[] not null default '{}',
  add column package_lpa numeric(5, 2) check (package_lpa is null or package_lpa >= 0),
  add column is_sample boolean not null default false;

-- Carry over any package typed as text (e.g. "12 LPA") into the numeric column.
-- The old text column `package` is no longer used by the site.
update public.students
set package_lpa = nullif(regexp_replace(package, '[^0-9.]', '', 'g'), '')::numeric
where package is not null and package ~ '[0-9]';

alter table public.events add column is_sample boolean not null default false;
alter table public.mentors add column is_sample boolean not null default false;

-- ---------- Projects built by HOPE students ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  tech text[] not null default '{}',
  batch_id uuid references public.batches(id) on delete set null,
  kind text not null default 'group' check (kind in ('group', 'individual')),
  image_path text,
  repo_url text,
  demo_url text,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index projects_batch_id_idx on public.projects (batch_id);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role text,
  primary key (project_id, student_id)
);
create index project_members_student_id_idx on public.project_members (student_id);

grant select on public.projects, public.project_members to anon, authenticated;
grant insert, update, delete on public.projects, public.project_members to authenticated;
grant select, insert, update, delete on public.projects, public.project_members to service_role;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "Read published projects" on public.projects for select to anon, authenticated
  using (is_published or (select private.is_admin()));
create policy "Admins insert projects" on public.projects for insert to authenticated
  with check ((select private.is_admin()));
create policy "Admins update projects" on public.projects for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete projects" on public.projects for delete to authenticated
  using ((select private.is_admin()));

-- Members are visible when their project is
create policy "Read members of visible projects" on public.project_members for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and (p.is_published or (select private.is_admin()))));
create policy "Admins insert project members" on public.project_members for insert to authenticated
  with check ((select private.is_admin()));
create policy "Admins update project members" on public.project_members for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete project members" on public.project_members for delete to authenticated
  using ((select private.is_admin()));

-- ---------- Live numbers for the home page ----------
-- SECURITY INVOKER: counts only what the caller may see (published rows for the public).
create or replace function public.get_hope_stats()
returns json
language sql
stable
security invoker
set search_path = ''
as $$
  select json_build_object(
    'students', (select count(*) from public.students),
    'batches', (select count(*) from public.batches),
    'placed', (select count(*) from public.students where company is not null),
    'top_package', (select max(package_lpa) from public.students),
    'avg_package', (select round(avg(package_lpa), 1) from public.students where package_lpa is not null),
    'companies', (select count(distinct lower(company)) from public.students where company is not null),
    'projects', (select count(*) from public.projects),
    'events_held', (select count(*) from public.events where coalesce(ends_at, starts_at) < now()),
    'certifications', (select coalesce(sum(cardinality(certifications)), 0) from public.students)
  );
$$;
grant execute on function public.get_hope_stats() to anon, authenticated;
