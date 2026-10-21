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

const STUDENT_COLUMNS = 'id, full_name, photo_path, employment, company, is_alumni, batch:batches(id, slug, name)';

export const getBatches = () =>
  run(supabase?.from('batches').select('id, slug, name, description, starts_on, ends_on').order('sort_order').order('name'));

export const getStudents = (batchId) =>
  run(supabase?.from('students').select(STUDENT_COLUMNS).eq('batch_id', batchId).order('full_name'));

export const getAlumni = () =>
  run(supabase?.from('students').select(STUDENT_COLUMNS).eq('is_alumni', true).order('full_name'));

// Highly placed students marked by admins for the Top placements wall
export const getFeatured = () =>
  run(
    supabase
      ?.from('students')
      .select('id, full_name, photo_path, employment, company, package, batch:batches(slug, name)')
      .eq('is_featured', true)
      .order('full_name'),
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

export const getMentors = () =>
  run(supabase?.from('mentors').select('id, full_name, role, department, teaches, photo_path').order('sort_order').order('full_name'));

export const getEvents = () =>
  run(supabase?.from('events').select('id, title, starts_at, ends_at, venue, summary, description, poster_path, register_url').order('starts_at'));

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
