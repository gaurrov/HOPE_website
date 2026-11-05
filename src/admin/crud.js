// Generic list + add/edit/delete screen for one table, plus the configs for events, batches and mentors.
import { supabase } from '../lib/supabase.js';
import { formatDate, formatTime, companyKey } from '../lib/data.js';
import { CITIES, findCity } from './cities.js';
import { h, table, thumb, toast, formDialog, confirmAction, resolveImage, removeImage, errorMessage } from './ui.js';

const yesNo = (v) => (v ? 'Yes' : 'No');

export function crudView(cfg) {
  return async function mount(panel) {
    let rows = [];
    const notice = h('div');
    const search = h('input', { type: 'search', class: 'asearch', placeholder: `Search ${cfg.title.toLowerCase()}`, 'aria-label': 'Search' });
    const listBox = h('div');
    panel.replaceChildren(
      h(
        'div',
        { class: 'panel__head' },
        h('div', {}, h('h1', { class: 'panel__title', text: cfg.title }), cfg.intro ? h('p', { class: 'panel__intro', text: cfg.intro }) : null),
        h('button', { type: 'button', class: 'abtn abtn--primary', text: `Add ${cfg.noun}`, onclick: () => edit(null) }),
      ),
      notice,
      h('div', { class: 'toolbar' }, search),
      listBox,
    );

    async function load() {
      let q = supabase.from(cfg.table).select(cfg.select || '*');
      for (const [col, opts] of cfg.order || []) q = q.order(col, opts);
      const { data, error } = await q;
      if (error) return toast(errorMessage(error), 'error');
      rows = cfg.enrich ? await cfg.enrich(data) : data;
      if (cfg.notice) notice.replaceChildren((await cfg.notice(rows, (preset) => edit(null, preset))) || '');
      draw();
    }

    function draw() {
      const term = search.value.trim().toLowerCase();
      const shown = term ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(term)) : rows;
      listBox.replaceChildren(
        table(cfg.columns, shown, (row) => [
          h('button', { type: 'button', class: 'abtn abtn--small', text: 'Edit', onclick: () => edit(row) }),
          h('button', { type: 'button', class: 'abtn abtn--small abtn--danger', text: 'Delete', onclick: () => remove(row) }),
        ]),
      );
    }
    search.addEventListener('input', draw);

    async function edit(row, preset = {}) {
      const fields = typeof cfg.fields === 'function' ? await cfg.fields() : cfg.fields;
      const saved = await formDialog({
        title: row ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`,
        fields,
        values: row || preset,
        onSubmit: async (values) => {
          const payload = { ...values };
          for (const key of cfg.readOnly || []) delete payload[key];
          cfg.validate?.(payload);
          for (const f of fields) {
            if (f.type === 'image') payload[f.name] = await resolveImage(values[f.name], cfg.folder);
            // A blank number falls back to its default (columns like sort_order can't be empty)
            if (f.type === 'number' && payload[f.name] == null && f.default != null) payload[f.name] = f.default;
          }
          const query = row ? supabase.from(cfg.table).update(payload).eq('id', row.id) : supabase.from(cfg.table).insert(payload);
          const { error } = await query;
          if (error) throw new Error(errorMessage(error));
        },
      });
      if (saved) {
        toast(row ? `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} updated` : `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} added`);
        load();
      }
    }

    async function remove(row) {
      const label = row[cfg.labelKey || 'name'] || row.title || row.full_name || cfg.noun;
      if (!(await confirmAction(`Delete "${label}"? This can't be undone.`))) return;
      const { error } = await supabase.from(cfg.table).delete().eq('id', row.id);
      if (error) return toast(errorMessage(error), 'error');
      for (const f of cfg.imageFields || []) await removeImage(row[f]);
      toast(`Deleted "${label}"`);
      load();
    }

    load();
  };
}

// ---------- Configs ----------
export const eventsView = crudView({
  title: 'Events',
  noun: 'event',
  table: 'events',
  folder: 'events',
  labelKey: 'title',
  imageFields: ['poster_path'],
  intro: 'Events with a start time in the future show under "Coming up" on the home page; the rest move to "Past events".',
  order: [['starts_at', { ascending: false }]],
  columns: [
    { label: 'Poster', render: (r) => thumb(r.poster_path) },
    { label: 'Title', key: 'title' },
    { label: 'When', render: (r) => `${formatDate(r.starts_at)}, ${formatTime(r.starts_at)}` },
    { label: 'Venue', key: 'venue' },
    { label: 'Status', render: (r) => (new Date(r.ends_at || r.starts_at) < new Date() ? 'Done' : 'Upcoming') },
    { label: 'Published', render: (r) => yesNo(r.is_published) },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, wide: true },
    { name: 'starts_at', label: 'Starts', type: 'datetime', required: true },
    { name: 'ends_at', label: 'Ends', type: 'datetime' },
    { name: 'venue', label: 'Venue', placeholder: 'Programming Lab 3, Block B' },
    { name: 'register_url', label: 'Registration link', type: 'url', placeholder: 'https://' },
    { name: 'summary', label: 'Short summary', type: 'textarea', rows: 2, wide: true, hint: 'One or two sentences shown on the event card.' },
    { name: 'description', label: 'Full description', type: 'textarea', rows: 5, wide: true },
    { name: 'poster_path', label: 'Poster or photo', type: 'image', wide: true },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
  ],
});

export const batchesView = crudView({
  title: 'Batches',
  noun: 'batch',
  table: 'batches',
  labelKey: 'name',
  intro: 'Each batch gets its own page at the web address shown, and appears on the Batches page in the order given by "Position".',
  order: [['sort_order', { ascending: true }], ['name', { ascending: true }]],
  columns: [
    { label: 'Name', key: 'name' },
    { label: 'Web address', render: (r) => `/batches/${r.slug}/` },
    { label: 'Dates', render: (r) => [formatDate(r.starts_on), formatDate(r.ends_on)].filter(Boolean).join(' to ') },
    { label: 'Position', key: 'sort_order' },
    { label: 'Published', render: (r) => yesNo(r.is_published) },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Elite' },
    { name: 'slug', label: 'Short name for the web address', required: true, placeholder: 'elite', hint: 'Lowercase letters, numbers and dashes only, like batch-4.' },
    { name: 'starts_on', label: 'Starts on', type: 'date' },
    { name: 'ends_on', label: 'Ends on', type: 'date' },
    { name: 'sort_order', label: 'Position', type: 'number', default: 0 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, wide: true },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
  ],
});

export const mentorsView = crudView({
  title: 'Mentors',
  noun: 'mentor',
  table: 'mentors',
  folder: 'mentors',
  labelKey: 'full_name',
  imageFields: ['photo_path'],
  intro: 'Mentors assigned by the college. They show in "Meet the mentors" on the home page.',
  order: [['sort_order', { ascending: true }], ['full_name', { ascending: true }]],
  columns: [
    { label: 'Photo', render: (r) => thumb(r.photo_path) },
    { label: 'Name', key: 'full_name' },
    { label: 'Role', render: (r) => [r.role, r.department].filter(Boolean).join(', ') },
    { label: 'Teaches', render: (r) => (r.teaches || []).join(', ') },
    { label: 'Published', render: (r) => yesNo(r.is_published) },
  ],
  fields: [
    { name: 'full_name', label: 'Name', required: true },
    { name: 'role', label: 'Role', placeholder: 'Assistant Professor' },
    { name: 'department', label: 'Department', placeholder: 'Computer Science' },
    { name: 'teaches', label: 'Teaches', type: 'tags', placeholder: 'DSA, Python', hint: 'Separate topics with commas.' },
    { name: 'sort_order', label: 'Position', type: 'number', default: 0 },
    { name: 'photo_path', label: 'Photo', type: 'image', wide: true },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
  ],
});

// Companies: each one is a node on the /companies/ globe. Students join a company by name.
export const companiesView = crudView({
  title: 'Companies',
  noun: 'company',
  table: 'companies',
  folder: 'companies',
  imageFields: ['logo_path'],
  intro: 'Every company with a location shows on the Companies globe, with the students whose company matches its name. Pick a city from the list to fill in its map position.',
  order: [['name', { ascending: true }]],
  readOnly: ['students'],
  // Count students per company by name, the same way the globe matches them
  async enrich(rows) {
    const { data } = await supabase.from('students').select('company').not('company', 'is', null);
    const counts = new Map();
    for (const s of data || []) counts.set(companyKey(s.company), (counts.get(companyKey(s.company)) || 0) + 1);
    rows.forEach((r) => (r.students = counts.get(companyKey(r.name)) || 0));
    companiesView.studentCompanies = counts;
    companiesView.names = new Set(rows.map((r) => companyKey(r.name)));
    return rows;
  },
  // Student companies with no row here yet: their students can't appear on the globe
  async notice(rows, add) {
    const { data } = await supabase.from('students').select('company').not('company', 'is', null);
    const known = new Set(rows.map((r) => companyKey(r.name)));
    const missing = new Map();
    for (const s of data || []) {
      const key = companyKey(s.company);
      if (key && !known.has(key)) missing.set(key, { name: s.company.trim(), n: (missing.get(key)?.n || 0) + 1 });
    }
    const unmapped = rows.filter((r) => r.lat == null).length;
    if (!missing.size && !unmapped) return null;
    return h(
      'div',
      { class: 'notice' },
      missing.size
        ? h(
            'p',
            {},
            `${missing.size === 1 ? 'This company appears' : 'These companies appear'} in student records but not here, so those students aren't on the globe yet: `,
            ...[...missing.values()].map((m) =>
              h('button', { type: 'button', class: 'abtn abtn--small', text: `Add ${m.name} (${m.n})`, onclick: () => add({ name: m.name, is_published: true }) }),
            ),
          )
        : null,
      unmapped ? h('p', { text: `${unmapped === 1 ? '1 company has' : `${unmapped} companies have`} no location yet. Edit ${unmapped === 1 ? 'it' : 'them'} and pick a city to put ${unmapped === 1 ? 'it' : 'them'} on the globe.` }) : null,
    );
  },
  validate(p) {
    if ((p.lat == null) !== (p.lng == null)) throw new Error('Fill in both latitude and longitude, or leave both empty.');
  },
  columns: [
    { label: 'Logo', render: (r) => thumb(r.logo_path) },
    { label: 'Name', key: 'name' },
    { label: 'Location', render: (r) => [r.city, r.country].filter(Boolean).join(', ') || 'Not set' },
    { label: 'On the globe', render: (r) => (r.lat != null && r.is_published ? 'Yes' : r.lat == null ? 'No, add a location' : 'No, hidden') },
    { label: 'Students', render: (r) => String(r.students) },
    { label: 'Published', render: (r) => yesNo(r.is_published) },
  ],
  fields: [
    { name: 'name', label: 'Company name', required: true, placeholder: 'Zoho', hint: "Students whose company is written the same way (capitals don't matter) appear under it." },
    {
      name: 'city',
      label: 'City',
      placeholder: 'Chennai',
      suggest: CITIES.map((c) => c.city),
      hint: 'Pick from the list to fill in the country and map position.',
      onInput(value, controls) {
        const c = findCity(value);
        if (!c) return;
        controls.country.value = c.country;
        controls.lat.value = c.lat;
        controls.lng.value = c.lng;
      },
    },
    { name: 'country', label: 'Country', placeholder: 'India' },
    { type: 'heading', label: 'Map position', hint: 'Filled in when you pick a listed city. For any other place, right-click it in Google Maps and copy the two numbers.' },
    { name: 'lat', label: 'Latitude', type: 'number', step: 'any', min: -90, max: 90, placeholder: '13.0827' },
    { name: 'lng', label: 'Longitude', type: 'number', step: 'any', min: -180, max: 180, placeholder: '80.2707' },
    { name: 'website', label: 'Website', type: 'url', placeholder: 'https://', wide: true },
    { name: 'logo_path', label: 'Logo (optional)', type: 'image', wide: true },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
  ],
});
