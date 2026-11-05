-- Companies where HOPE students are placed or work, with a map location for the /companies/ globe.
-- Applied to project lnzpkbazdutogwwhasix on 2026-10-22. Keep this file in sync with the database.
-- Students link by name: students.company matches companies.name ignoring case and spaces.
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  city text,
  country text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  website text,
  logo_path text,
  is_published boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  constraint companies_location_pair check ((lat is null) = (lng is null))
);
create unique index companies_name_key on public.companies (lower(trim(name)));

alter table public.companies enable row level security;
create policy "Read published companies" on public.companies for select to anon, authenticated
  using (is_published or (select private.is_admin()));
create policy "Admins manage companies" on public.companies for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
grant select on public.companies to anon, authenticated;
grant insert, update, delete on public.companies to authenticated;

-- Sample companies for the sample students (removed with the rest of the sample data)
insert into public.companies (name, city, country, lat, lng, website, is_sample) values
  ('Zoho', 'Chennai', 'India', 12.8300, 80.0500, 'https://www.zoho.com', true),
  ('Freshworks', 'Chennai', 'India', 12.9600, 80.2450, 'https://www.freshworks.com', true),
  ('Chargebee', 'Chennai', 'India', 13.0120, 80.2200, 'https://www.chargebee.com', true),
  ('Kissflow', 'Chennai', 'India', 12.9900, 80.2500, 'https://kissflow.com', true),
  ('Hexaware', 'Chennai', 'India', 12.8250, 80.2150, 'https://hexaware.com', true),
  ('Infosys', 'Mysuru', 'India', 12.3550, 76.5950, 'https://www.infosys.com', true),
  ('PayPal', 'Bengaluru', 'India', 12.9300, 77.6900, 'https://www.paypal.com', true),
  ('Walmart Global Tech', 'Bengaluru', 'India', 12.9750, 77.7000, 'https://tech.walmart.com', true),
  ('Amazon', 'Hyderabad', 'India', 17.4200, 78.3400, 'https://www.amazon.jobs', true),
  ('Accenture', 'Hyderabad', 'India', 17.4450, 78.3800, 'https://www.accenture.com', true),
  ('Cognizant', 'Pune', 'India', 18.5900, 73.7400, 'https://www.cognizant.com', true),
  ('TCS Digital', 'Mumbai', 'India', 19.0760, 72.8777, 'https://www.tcs.com', true);
