// Students: public row in `students`, private details in `student_private` (admin-only). CSV import/export.
import { supabase } from '../lib/supabase.js';
import { employmentLine, formatPackage } from '../lib/data.js';
import { h, table, thumb, toast, formDialog, confirmAction, resolveImage, removeImage, errorMessage } from './ui.js';
import { parseCsv, toCsv, download } from './csv.js';

const PRIVATE_KEYS = ['roll_no', 'email', 'phone', 'department', 'year_of_study', 'job_role', 'linkedin_url', 'notes'];
const CSV_HEADERS = ['full_name', 'batch', 'roll_no', 'email', 'phone', 'department', 'year_of_study', 'employment', 'company', 'package_lpa', 'is_featured', 'skills', 'certifications', 'job_role', 'linkedin_url', 'is_alumni', 'notes'];
const list = (v) => String(v || '').split(/[;,]/).map((x) => x.trim()).filter(Boolean);
const truthy = (v) => /^(y|yes|true|1)$/i.test(String(v || '').trim());
const one = (v) => (Array.isArray(v) ? v[0] : v) || {};

function studentFields(batches) {
  return [
    { type: 'heading', label: 'Shown on the website', hint: 'Name, photo, batch, placement, skills and certifications' },
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'batch_id', label: 'Batch', type: 'select', options: [{ value: '', label: 'No batch' }, ...batches.map((b) => ({ value: b.id, label: b.name }))] },
    {
      name: 'employment',
      label: 'Placement',
      type: 'select',
      options: [
        { value: '', label: 'Not placed yet' },
        { value: 'placed', label: 'Placed' },
        { value: 'working', label: 'Working' },
      ],
    },
    { name: 'company', label: 'Company', placeholder: 'Shown as "Placed at …" or "Works at …"' },
    { name: 'photo_path', label: 'Photo', type: 'image', wide: true },
    { name: 'is_featured', label: 'Top placement (shows on the home page wall)', type: 'checkbox' },
    { name: 'package_lpa', label: 'Package in LPA (optional)', type: 'number', step: 0.01, min: 0, placeholder: '12', hint: 'Lakhs per annum, e.g. 9.5. Shown only if filled in.' },
    { name: 'skills', label: 'Skills', type: 'tags', placeholder: 'Java, DSA, React', hint: 'Separate with commas.', wide: true },
    { name: 'certifications', label: 'Certifications', type: 'tags', placeholder: 'AWS Cloud Practitioner, NPTEL DSA', hint: 'Separate with commas.', wide: true },
    { name: 'is_alumni', label: 'Alumni (shows on the Alumni page)', type: 'checkbox' },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
    { type: 'heading', label: 'Admin only', hint: 'Never shown on the website' },
    { name: 'roll_no', label: 'Roll number' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'department', label: 'Department' },
    { name: 'year_of_study', label: 'Year of study', placeholder: '2nd year' },
    { name: 'job_role', label: 'Job role', placeholder: 'Software Engineer' },
    { name: 'linkedin_url', label: 'LinkedIn', type: 'url', placeholder: 'https://' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, wide: true },
  ];
}

async function saveStudent(existingId, values) {
  const pub = {
    full_name: values.full_name,
    batch_id: values.batch_id || null,
    employment: values.employment || null,
    company: values.company,
    photo_path: values.photo_path,
    is_alumni: values.is_alumni,
    is_featured: values.is_featured,
    package_lpa: values.package_lpa,
    skills: values.skills || [],
    certifications: values.certifications || [],
    is_published: values.is_published,
  };
  let id = existingId;
  if (id) {
    const { error } = await supabase.from('students').update(pub).eq('id', id);
    if (error) throw new Error(errorMessage(error));
  } else {
    const { data, error } = await supabase.from('students').insert(pub).select('id').single();
    if (error) throw new Error(errorMessage(error));
    id = data.id;
  }
  const priv = { student_id: id, updated_at: new Date().toISOString() };
  PRIVATE_KEYS.forEach((k) => (priv[k] = values[k] ?? null));
  const { error } = await supabase.from('student_private').upsert(priv);
  if (error) throw new Error(errorMessage(error));
}

export async function studentsView(panel) {
  let batches = [];
  let rows = [];

  const batchFilter = h('select', { 'aria-label': 'Filter by batch', class: 'aselect' });
  const statusFilter = h(
    'select',
    { 'aria-label': 'Filter by status', class: 'aselect' },
    h('option', { value: '', text: 'Everyone' }),
    h('option', { value: 'current', text: 'Current students' }),
    h('option', { value: 'alumni', text: 'Alumni' }),
    h('option', { value: 'placed', text: 'Placed or working' }),
    h('option', { value: 'featured', text: 'Top placements' }),
  );
  const search = h('input', { type: 'search', class: 'asearch', placeholder: 'Search name, roll number, email', 'aria-label': 'Search students' });
  const count = h('p', { class: 'toolbar__count' });
  const listBox = h('div');

  panel.replaceChildren(
    h(
      'div',
      { class: 'panel__head' },
      h('div', {}, h('h1', { class: 'panel__title', text: 'Students' }), h('p', { class: 'panel__intro', text: 'The website shows only name, photo, batch and company. Everything else here stays private to admins.' })),
      h(
        'div',
        { class: 'panel__actions' },
        h('button', { type: 'button', class: 'abtn', text: 'Import CSV', onclick: importCsv }),
        h('button', { type: 'button', class: 'abtn', text: 'Export CSV', onclick: exportCsv }),
        h('button', { type: 'button', class: 'abtn abtn--primary', text: 'Add student', onclick: () => edit(null) }),
      ),
    ),
    h('div', { class: 'toolbar' }, batchFilter, statusFilter, search, count),
    listBox,
  );

  async function load() {
    const [b, s] = await Promise.all([
      supabase.from('batches').select('id, name, slug').order('sort_order').order('name'),
      supabase.from('students').select('*, batch:batches(id, name, slug), private:student_private(*)').order('full_name'),
    ]);
    if (b.error || s.error) return toast(errorMessage(b.error || s.error), 'error');
    batches = b.data;
    rows = s.data.map((r) => ({ ...r, private: one(r.private) }));
    const keep = batchFilter.value;
    batchFilter.replaceChildren(
      h('option', { value: '', text: 'All batches' }),
      ...batches.map((x) => h('option', { value: x.id, text: x.name })),
      h('option', { value: 'none', text: 'No batch' }),
    );
    batchFilter.value = keep;
    draw();
  }

  function filtered() {
    const term = search.value.trim().toLowerCase();
    return rows.filter((r) => {
      if (batchFilter.value === 'none' ? r.batch_id : batchFilter.value && r.batch_id !== batchFilter.value) return false;
      if (statusFilter.value === 'current' && r.is_alumni) return false;
      if (statusFilter.value === 'alumni' && !r.is_alumni) return false;
      if (statusFilter.value === 'placed' && !r.company) return false;
      if (statusFilter.value === 'featured' && !r.is_featured) return false;
      if (!term) return true;
      return [r.full_name, r.private.roll_no, r.private.email, r.company].some((v) => (v || '').toLowerCase().includes(term));
    });
  }

  function draw() {
    const shown = filtered();
    count.textContent = `${shown.length} of ${rows.length}`;
    listBox.replaceChildren(
      table(
        [
          { label: 'Photo', render: (r) => thumb(r.photo_path) },
          { label: 'Name', key: 'full_name' },
          { label: 'Batch', render: (r) => r.batch?.name || '' },
          { label: 'Roll no', render: (r) => r.private.roll_no || '' },
          { label: 'Email', render: (r) => r.private.email || '' },
          { label: 'Phone', render: (r) => r.private.phone || '' },
          { label: 'Status', render: (r) => (r.is_alumni ? 'Alumni' : 'Student') },
          { label: 'Placement', render: (r) => [employmentLine(r), formatPackage(r.package_lpa)].filter(Boolean).join(', ') },
          { label: 'Top', render: (r) => (r.is_featured ? 'Yes' : '') },
          { label: 'On site', render: (r) => (r.is_published ? 'Yes' : 'No') },
        ],
        shown,
        (row) => [
          h('button', { type: 'button', class: 'abtn abtn--small', text: 'Edit', onclick: () => edit(row) }),
          h('button', { type: 'button', class: 'abtn abtn--small abtn--danger', text: 'Delete', onclick: () => remove(row) }),
        ],
      ),
    );
  }
  [batchFilter, statusFilter].forEach((c) => c.addEventListener('change', draw));
  search.addEventListener('input', draw);

  async function edit(row) {
    const values = row ? { ...row, ...row.private, batch_id: row.batch_id || '', employment: row.employment || '' } : { batch_id: batchFilter.value && batchFilter.value !== 'none' ? batchFilter.value : '' };
    const saved = await formDialog({
      title: row ? `Edit ${row.full_name}` : 'Add student',
      fields: studentFields(batches),
      values,
      onSubmit: async (v) => {
        v.photo_path = await resolveImage(v.photo_path, 'students');
        await saveStudent(row?.id, v);
      },
    });
    if (saved) {
      toast(row ? 'Student updated' : 'Student added');
      load();
    }
  }

  async function remove(row) {
    if (!(await confirmAction(`Delete ${row.full_name}? Their private details are deleted too. This can't be undone.`))) return;
    const { error } = await supabase.from('students').delete().eq('id', row.id);
    if (error) return toast(errorMessage(error), 'error');
    await removeImage(row.photo_path);
    toast(`Deleted ${row.full_name}`);
    load();
  }

  function exportCsv() {
    const out = filtered().map((r) => ({ ...r.private, ...r, batch: r.batch?.slug || '', is_alumni: r.is_alumni ? 'yes' : 'no', is_featured: r.is_featured ? 'yes' : 'no' }));
    download(`hope-students-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(CSV_HEADERS, out));
  }

  function importCsv() {
    const file = h('input', { type: 'file', accept: '.csv,text/csv', id: 'csv-file' });
    const report = h('p', { class: 'modal__message' });
    const run = h('button', { type: 'button', class: 'abtn abtn--primary', text: 'Import', disabled: true });
    let parsed = [];

    file.addEventListener('change', async () => {
      parsed = parseCsv(await file.files[0].text()).filter((r) => (r.full_name || r.name || '').trim());
      report.textContent = parsed.length ? `${parsed.length} students found. Check the batch names, then import.` : 'No rows with a full_name were found.';
      run.disabled = !parsed.length;
    });

    run.addEventListener('click', async () => {
      run.disabled = true;
      const bySlugOrName = new Map(batches.flatMap((b) => [[b.slug.toLowerCase(), b.id], [b.name.toLowerCase(), b.id]]));
      let ok = 0;
      const problems = [];
      for (const [i, r] of parsed.entries()) {
        report.textContent = `Importing ${i + 1} of ${parsed.length}`;
        const batchKey = (r.batch || '').toLowerCase();
        const batchId = batchKey ? bySlugOrName.get(batchKey) : null;
        if (batchKey && !batchId) problems.push(`Row ${i + 2}: unknown batch "${r.batch}", imported without a batch`);
        const employment = /^(placed|working)$/i.test(r.employment || '') ? r.employment.toLowerCase() : null;
        try {
          await saveStudent(null, {
            full_name: r.full_name || r.name,
            batch_id: batchId,
            employment,
            company: r.company || null,
            photo_path: null,
            is_alumni: truthy(r.is_alumni || r.alumni),
            is_featured: truthy(r.is_featured),
            package_lpa: r.package_lpa ? Number(String(r.package_lpa).replace(/[^0-9.]/g, '')) || null : null,
            skills: list(r.skills),
            certifications: list(r.certifications),
            is_published: true,
            roll_no: r.roll_no || null,
            email: r.email || null,
            phone: r.phone || null,
            department: r.department || null,
            year_of_study: r.year_of_study || r.year || null,
            job_role: r.job_role || null,
            linkedin_url: r.linkedin_url || r.linkedin || null,
            notes: r.notes || null,
          });
          ok++;
        } catch (err) {
          problems.push(`Row ${i + 2}: ${err.message}`);
        }
      }
      report.textContent = `Imported ${ok} of ${parsed.length}.${problems.length ? ' ' + problems.slice(0, 5).join('. ') : ''}`;
      toast(`Imported ${ok} students`);
      load();
    });

    const dialog = h(
      'dialog',
      { class: 'modal' },
      h('h2', { class: 'modal__title', text: 'Import students from CSV' }),
      h('p', {
        class: 'modal__message',
        text: 'Use one row per student. Only full_name is required. The batch column takes the batch name or its short name (for example HOPE Elite or elite). Use "placed" or "working" in the employment column, a number like 9.5 in package_lpa, semicolons between skills or certifications, and "yes" in is_alumni or is_featured where it applies.',
      }),
      h('p', {}, h('button', { type: 'button', class: 'abtn abtn--small', text: 'Download a template', onclick: () => download('hope-students-template.csv', toCsv(CSV_HEADERS, [])) })),
      h('div', { class: 'field field--wide' }, h('label', { for: 'csv-file', text: 'CSV file' }), file),
      report,
      h('div', { class: 'modal__actions' }, h('button', { type: 'button', class: 'abtn', text: 'Close', onclick: () => dialog.close() }), run),
    );
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  }

  load();
}
