// Admins: invite by email (via the manage-admins Edge Function), edit details, remove.
import { supabase } from '../lib/supabase.js';
import { h, table, thumb, toast, formDialog, confirmAction, resolveImage, errorMessage } from './ui.js';

async function callFunction(body) {
  const { data, error } = await supabase.functions.invoke('manage-admins', { body });
  if (error) {
    // The function returns { error } with a readable message; surface it if we can
    let message = error.message;
    try {
      message = (await error.context.json()).error || message;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  return data;
}

export function adminsView(currentUserId) {
  return async function mount(panel) {
    const listBox = h('div');
    panel.replaceChildren(
      h(
        'div',
        { class: 'panel__head' },
        h('div', {}, h('h1', { class: 'panel__title', text: 'Admins' }), h('p', { class: 'panel__intro', text: 'Admins can see and change everything. New admins get an email invite to set their own password. Admins marked "On site" appear in The HOPE team on the home page with their photo, name and designation (never email or phone).' })),
        h('button', { type: 'button', class: 'abtn abtn--primary', text: 'Invite admin', onclick: invite }),
      ),
      listBox,
    );

    async function load() {
      const { data, error } = await supabase.from('admins').select('*').order('sort_order').order('full_name');
      if (error) return toast(errorMessage(error), 'error');
      listBox.replaceChildren(
        table(
          [
            { label: 'Photo', render: (r) => thumb(r.photo_path) },
            { label: 'Name', render: (r) => (r.id === currentUserId ? `${r.full_name} (you)` : r.full_name) },
            { label: 'Email', key: 'email' },
            { label: 'Designation', key: 'designation' },
            { label: 'Phone', key: 'phone' },
            { label: 'On site', render: (r) => (r.show_on_site ? 'Yes' : 'No') },
          ],
          data,
          (row) => [
            h('button', { type: 'button', class: 'abtn abtn--small', text: 'Edit', onclick: () => edit(row) }),
            row.id === currentUserId ? null : h('button', { type: 'button', class: 'abtn abtn--small abtn--danger', text: 'Remove', onclick: () => remove(row) }),
          ],
        ),
      );
    }

    async function invite() {
      const sent = await formDialog({
        title: 'Invite an admin',
        submitLabel: 'Send invite',
        fields: [
          { name: 'full_name', label: 'Name', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'designation', label: 'Designation', placeholder: 'Faculty coordinator' },
          { name: 'phone', label: 'Phone', type: 'tel' },
        ],
        onSubmit: (v) => callFunction({ action: 'invite', ...v, redirect_to: `${location.origin}/hope-hq/` }),
      });
      if (sent) {
        toast('Invite sent. They will get an email to set a password.');
        load();
      }
    }

    async function edit(row) {
      const saved = await formDialog({
        title: `Edit ${row.full_name}`,
        values: row,
        fields: [
          { name: 'full_name', label: 'Name', required: true },
          { name: 'designation', label: 'Designation' },
          { name: 'phone', label: 'Phone', type: 'tel', hint: 'Admin only. Never shown on the site.' },
          { name: 'sort_order', label: 'Position in The HOPE team', type: 'number' },
          { name: 'photo_path', label: 'Photo', type: 'image', wide: true },
          { name: 'show_on_site', label: 'Show in The HOPE team on the home page', type: 'checkbox', default: true },
        ],
        onSubmit: async (v) => {
          v.photo_path = await resolveImage(v.photo_path, 'admins');
          v.sort_order ??= 0;
          const { error } = await supabase.from('admins').update(v).eq('id', row.id);
          if (error) throw new Error(errorMessage(error));
        },
      });
      if (saved) {
        toast('Admin updated');
        load();
      }
    }

    async function remove(row) {
      if (!(await confirmAction(`Remove ${row.full_name} as an admin? Their login is deleted and they lose all access.`, 'Remove'))) return;
      try {
        await callFunction({ action: 'remove', id: row.id });
        toast(`${row.full_name} removed`);
        load();
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    load();
  };
}
