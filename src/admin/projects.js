// Projects: title, batch, tech, links, image, and the students who built it (project_members).
import { supabase } from '../lib/supabase.js';
import { h, table, thumb, toast, formDialog, confirmAction, resolveImage, removeImage, errorMessage } from './ui.js';

export async function projectsView(panel) {
  let rows = [];
  let batches = [];
  let students = [];
  const search = h('input', { type: 'search', class: 'asearch', placeholder: 'Search projects, tech or members', 'aria-label': 'Search projects' });
  const listBox = h('div');
  panel.replaceChildren(
    h(
      'div',
      { class: 'panel__head' },
      h('div', {}, h('h1', { class: 'panel__title', text: 'Projects' }), h('p', { class: 'panel__intro', text: 'Projects show on their batch page under Projects, and on each team member\'s profile.' })),
      h('button', { type: 'button', class: 'abtn abtn--primary', text: 'Add project', onclick: () => edit(null) }),
    ),
    h('div', { class: 'toolbar' }, search),
    listBox,
  );

  async function load() {
    const [p, b, s] = await Promise.all([
      supabase.from('projects').select('*, batch:batches(name), members:project_members(student_id, role, student:students(full_name))').order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name').order('sort_order'),
      supabase.from('students').select('id, full_name, batch:batches(name)').order('full_name'),
    ]);
    const error = p.error || b.error || s.error;
    if (error) return toast(errorMessage(error), 'error');
    rows = p.data;
    batches = b.data;
    students = s.data;
    draw();
  }

  function draw() {
    const term = search.value.trim().toLowerCase();
    const shown = term ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(term)) : rows;
    listBox.replaceChildren(
      table(
        [
          { label: 'Image', render: (r) => thumb(r.image_path) },
          { label: 'Title', key: 'title' },
          { label: 'Batch', render: (r) => r.batch?.name || '' },
          { label: 'Kind', render: (r) => (r.kind === 'individual' ? 'Individual' : 'Group') },
          { label: 'Team', render: (r) => r.members.map((m) => m.student?.full_name).filter(Boolean).join(', ') },
          { label: 'Tech', render: (r) => (r.tech || []).join(', ') },
          { label: 'Featured', render: (r) => (r.is_featured ? 'Yes' : '') },
        ],
        shown,
        (row) => [
          h('button', { type: 'button', class: 'abtn abtn--small', text: 'Edit', onclick: () => edit(row) }),
          h('button', { type: 'button', class: 'abtn abtn--small abtn--danger', text: 'Delete', onclick: () => remove(row) }),
        ],
      ),
    );
  }
  search.addEventListener('input', draw);

  async function edit(row) {
    const lead = row?.members.find((m) => m.role === 'Lead')?.student_id || '';
    const studentOptions = students.map((s) => ({ value: s.id, label: s.batch ? `${s.full_name} (${s.batch.name})` : s.full_name }));
    const saved = await formDialog({
      title: row ? `Edit ${row.title}` : 'Add project',
      values: row ? { ...row, batch_id: row.batch_id || '', members: row.members.map((m) => m.student_id), lead } : { kind: 'group', batch_id: batches[0]?.id || '' },
      fields: [
        { name: 'title', label: 'Title', required: true, wide: true },
        { name: 'batch_id', label: 'Batch', type: 'select', options: [{ value: '', label: 'No batch' }, ...batches.map((b) => ({ value: b.id, label: b.name }))] },
        { name: 'kind', label: 'Kind', type: 'select', options: [{ value: 'group', label: 'Group project' }, { value: 'individual', label: 'Individual project' }] },
        { name: 'summary', label: 'Summary', type: 'textarea', rows: 3, wide: true, hint: 'One or two sentences: what it does and who it helps.' },
        { name: 'tech', label: 'Tech used', type: 'tags', placeholder: 'React, Node.js, PostgreSQL', wide: true },
        { name: 'repo_url', label: 'Code link', type: 'url', placeholder: 'https://github.com/...' },
        { name: 'demo_url', label: 'Live demo link', type: 'url', placeholder: 'https://' },
        { name: 'members', label: 'Team members', type: 'multiselect', options: studentOptions, wide: true, hint: 'Hold Ctrl (or Cmd on a Mac) to pick more than one.' },
        { name: 'lead', label: 'Team lead', type: 'select', options: [{ value: '', label: 'No lead' }, ...studentOptions] },
        { name: 'image_path', label: 'Screenshot or photo', type: 'image', wide: true },
        { name: 'is_featured', label: 'Featured (shown first)', type: 'checkbox' },
        { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
      ],
      onSubmit: async (v) => {
        const members = v.members || [];
        if (v.lead && !members.includes(v.lead)) members.push(v.lead);
        const payload = {
          title: v.title,
          batch_id: v.batch_id || null,
          kind: v.kind,
          summary: v.summary,
          tech: v.tech,
          repo_url: v.repo_url,
          demo_url: v.demo_url,
          image_path: await resolveImage(v.image_path, 'projects'),
          is_featured: v.is_featured,
          is_published: v.is_published,
        };
        let id = row?.id;
        if (id) {
          const { error } = await supabase.from('projects').update(payload).eq('id', id);
          if (error) throw new Error(errorMessage(error));
        } else {
          const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
          if (error) throw new Error(errorMessage(error));
          id = data.id;
        }
        // Replace the team
        const del = await supabase.from('project_members').delete().eq('project_id', id);
        if (del.error) throw new Error(errorMessage(del.error));
        if (members.length) {
          const ins = await supabase
            .from('project_members')
            .insert(members.map((sid) => ({ project_id: id, student_id: sid, role: sid === v.lead ? 'Lead' : null })));
          if (ins.error) throw new Error(errorMessage(ins.error));
        }
      },
    });
    if (saved) {
      toast(row ? 'Project updated' : 'Project added');
      load();
    }
  }

  async function remove(row) {
    if (!(await confirmAction(`Delete "${row.title}"? This can't be undone.`))) return;
    const { error } = await supabase.from('projects').delete().eq('id', row.id);
    if (error) return toast(errorMessage(error), 'error');
    await removeImage(row.image_path);
    toast(`Deleted "${row.title}"`);
    load();
  }

  load();
}
