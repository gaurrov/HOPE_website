// Public reads. Only published rows and public columns come back (enforced by RLS in the database).
import { supabase } from './supabase.js';

async function run(query, fallback = []) {
  if (!supabase) return fallback;
  const { data, error } = await query;
  if (error) {
    console.error(error);
    return fallback;
  }
  return data ?? fallback;
}

// Stand-in photos from public/photos for sample rows, until the college's real photos arrive.
// Only rows flagged is_sample get one, so a real record never shows a stock image.
const standIn = (kind, count, n) => `/photos/${kind}-${String((n % count) + 1).padStart(2, '0')}.jpg`;
const withStandIns = (rows, field, kind, count, pick = (_, i) => i) =>
  rows.map((r, i) => (r.is_sample && !r[field] ? { ...r, [field]: standIn(kind, count, pick(r, i)) } : r));

// Students are picked by id so one person keeps the same face on every page
const hash = (text) => [...String(text)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
const studentPhotos = (rows) => withStandIns(rows, 'photo_path', 'student', 12, (s) => hash(s.id));

const STUDENT_COLUMNS =
  'id, full_name, photo_path, is_sample, employment, company, package_lpa, skills, certifications, is_alumni, is_featured, batch:batches(id, slug, name)';

export const getBatches = () =>
  run(supabase?.from('batches').select('id, slug, name, description, starts_on, ends_on').order('sort_order').order('name'));

export const getStudents = async (batchId) =>
  studentPhotos(await run(supabase?.from('students').select(STUDENT_COLUMNS).eq('batch_id', batchId).order('full_name')));

export const getAlumni = async () =>
  studentPhotos(await run(supabase?.from('students').select(STUDENT_COLUMNS).eq('is_alumni', true).order('full_name')));

// Highly placed students marked by admins for the Top placements wall
export const getFeatured = async () =>
  studentPhotos(
    await run(
      supabase
        ?.from('students')
        .select('id, full_name, photo_path, is_sample, employment, company, package_lpa, batch:batches(slug, name)')
        .eq('is_featured', true)
        .order('package_lpa', { ascending: false, nullsFirst: false }),
    ),
  );

// Admins who chose to appear on the site: name, designation and photo only (see public.get_team)
export const getTeam = () => run(supabase?.rpc('get_team'));

// { batchId: { students, placed } } from public student rows
export async function getBatchStats() {
  const rows = await run(supabase?.from('students').select('batch_id, company'));
  const stats = {};
  rows.forEach((r) => {
    if (!r.batch_id) return;
    stats[r.batch_id] ??= { students: 0, placed: 0 };
    stats[r.batch_id].students++;
    if (r.company) stats[r.batch_id].placed++;
  });
  return stats;
}

// Projects with their team members; pass a batch id to limit to one batch
export async function getProjects(batchId) {
  let q = supabase
    ?.from('projects')
    .select('id, title, summary, tech, kind, image_path, is_sample, repo_url, demo_url, is_featured, batch:batches(slug, name), members:project_members(role, student:students(id, full_name, photo_path, is_sample))')
    .order('is_featured', { ascending: false })
    .order('title');
  if (q && batchId) q = q.eq('batch_id', batchId);
  const rows = withStandIns(await run(q), 'image_path', 'project', 4);
  return rows.map((p) => ({
    ...p,
    members: (p.members || []).map((m) => ({ ...m, student: m.student && studentPhotos([m.student])[0] })),
  }));
}

// Live numbers for "HOPE in numbers" (counts only what the public can see)
export const getStats = () => run(supabase?.rpc('get_hope_stats'), null);

// 24 → "24 LPA", 9.5 → "9.5 LPA"
export const formatPackage = (lpa) => (lpa == null ? '' : `${Number(lpa)} LPA`);

export const getMentors = async () =>
  withStandIns(
    await run(supabase?.from('mentors').select('id, full_name, role, department, teaches, photo_path, is_sample').order('sort_order').order('full_name')),
    'photo_path',
    'mentor',
    3,
  );

export const getEvents = async () =>
  withStandIns(
    await run(supabase?.from('events').select('id, title, starts_at, ends_at, venue, summary, description, poster_path, register_url, is_sample').order('starts_at')),
    'poster_path',
    'event',
    5,
  );

// Companies where students and alumni are placed or working, most common first
export async function getCompanies() {
  const rows = await run(supabase?.from('students').select('company').not('company', 'is', null));
  const counts = new Map();
  rows.forEach(({ company }) => {
    const name = company.trim();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

// Companies with their placed students, for the /companies/ globe.
// Students link to a company by name (case and extra spaces ignored).
export const companyKey = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
export async function getCompanyMap() {
  const [companies, students] = await Promise.all([
    run(supabase?.from('companies').select('id, name, city, country, lat, lng, website, logo_path').order('name')),
    run(supabase?.from('students').select(STUDENT_COLUMNS).not('company', 'is', null).order('full_name')).then(studentPhotos),
  ]);
  const byKey = new Map(companies.map((c) => [companyKey(c.name), { ...c, students: [] }]));
  const unlisted = new Map(); // student companies with no row (or no location) yet
  for (const s of students) {
    const key = companyKey(s.company);
    if (!key) continue;
    const c = byKey.get(key);
    if (c) c.students.push(s);
    else {
      if (!unlisted.has(key)) unlisted.set(key, { name: s.company.trim(), students: [] });
      unlisted.get(key).students.push(s);
    }
  }
  const all = [...byKey.values()];
  const mapped = all.filter((c) => c.lat != null && c.lng != null);
  const missing = [...all.filter((c) => c.lat == null || c.lng == null), ...unlisted.values()].filter((c) => c.students.length);

  // Group mapped companies by city; a company without a city gets a place of its own
  const cities = new Map();
  for (const c of mapped) {
    const key = c.city ? `${companyKey(c.city)}|${companyKey(c.country)}` : `at|${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
    if (!cities.has(key)) cities.set(key, { key, name: c.city || c.name, country: c.country || '', companies: [] });
    cities.get(key).companies.push(c);
  }
  for (const city of cities.values()) {
    city.lat = city.companies.reduce((n, c) => n + c.lat, 0) / city.companies.length;
    city.lng = city.companies.reduce((n, c) => n + c.lng, 0) / city.companies.length;
    city.companies.sort((a, b) => b.students.length - a.students.length || a.name.localeCompare(b.name));
  }
  const list = [...cities.values()].sort(
    (a, b) => b.companies.reduce((n, c) => n + c.students.length, 0) - a.companies.reduce((n, c) => n + c.students.length, 0),
  );
  return { cities: list, missing };
}

// { slot: path } for the design photo slots (gallery, tracks, lab, ...)
export async function getSiteMedia() {
  const rows = await run(supabase?.from('site_media').select('slot, path'));
  return Object.fromEntries(rows.map((r) => [r.slot, r.path]));
}

// "Placed at Zoho" / "Works at Freshworks"
export function employmentLine(student) {
  if (!student.company) return '';
  return `${student.employment === 'working' ? 'Works at' : 'Placed at'} ${student.company}`;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const partsFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '');
export const formatTime = (iso) => (iso ? timeFmt.format(new Date(iso)) : '');
export function dateParts(iso) {
  const parts = partsFmt.formatToParts(new Date(iso));
  return { day: parts.find((p) => p.type === 'day')?.value, month: parts.find((p) => p.type === 'month')?.value };
}
