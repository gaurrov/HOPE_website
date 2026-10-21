// Small DOM toolkit for the admin area: elements, dialogs, forms, tables, toasts, uploads.
import { supabase, mediaUrl } from '../lib/supabase.js';

export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ---------- Toasts ----------
let toastBox;
export function toast(message, kind = 'ok') {
  toastBox ??= document.body.appendChild(h('div', { class: 'toasts', role: 'status' }));
  const t = h('p', { class: `toast toast--${kind}`, text: message });
  toastBox.append(t);
  setTimeout(() => t.remove(), kind === 'error' ? 7000 : 3500);
}

// ---------- Confirm ----------
export function confirmAction(message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const dialog = h(
      'dialog',
      { class: 'modal modal--small' },
      h('p', { class: 'modal__message', text: message }),
      h(
        'div',
        { class: 'modal__actions' },
        h('button', { type: 'button', class: 'abtn', text: 'Cancel', onclick: () => dialog.close('cancel') }),
        h('button', { type: 'button', class: 'abtn abtn--danger', text: confirmLabel, onclick: () => dialog.close('ok') }),
      ),
    );
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'ok');
      dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

// ---------- Values ----------
const pad = (n) => String(n).padStart(2, '0');
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const blankToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v);

// ---------- Uploads (media bucket) ----------
export async function uploadImage(file, folder) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}
export async function removeImage(path) {
  if (path) await supabase.storage.from('media').remove([path]);
}

// ---------- Form dialog ----------
// fields: [{ name, label, type, required, options, hint, folder, placeholder }]
// onSubmit(values) may throw; the message is shown in the dialog.
export function formDialog({ title, fields, values = {}, submitLabel = 'Save', onSubmit }) {
  return new Promise((resolve) => {
    const controls = {};
    const error = h('p', { class: 'modal__error', role: 'alert' });

    const rows = fields.map((f) => {
      if (f.type === 'heading') return h('h3', { class: 'fields__heading', text: f.label }, f.hint ? h('span', { text: f.hint }) : null);
      const id = `f-${f.name}`;
      const v = values[f.name];
      let control;
      if (f.type === 'textarea') {
        control = h('textarea', { id, name: f.name, rows: f.rows || 4, placeholder: f.placeholder });
        control.value = v ?? '';
      } else if (f.type === 'select') {
        control = h('select', { id, name: f.name }, ...f.options.map((o) => h('option', { value: o.value, text: o.label })));
        control.value = v ?? f.options[0]?.value ?? '';
      } else if (f.type === 'checkbox') {
        control = h('input', { id, name: f.name, type: 'checkbox' });
        control.checked = v ?? f.default ?? false;
      } else if (f.type === 'image') {
        const preview = h('div', { class: 'imgfield__preview' });
        const showPreview = (src) => preview.replaceChildren(src ? h('img', { src, alt: '' }) : h('span', { text: 'No photo yet' }));
        showPreview(mediaUrl(v));
        const file = h('input', { id, type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif' });
        const remove = h('input', { type: 'checkbox', id: `${id}-remove` });
        file.addEventListener('change', () => {
          const f0 = file.files[0];
          if (f0) showPreview(URL.createObjectURL(f0));
          remove.checked = false;
        });
        control = h(
          'div',
          { class: 'imgfield' },
          preview,
          h('div', { class: 'imgfield__controls' }, file, v ? h('label', { class: 'inline' }, remove, ' Remove photo') : null),
        );
        control._file = file;
        control._remove = remove;
      } else {
        const type = { datetime: 'datetime-local', tags: 'text' }[f.type] || f.type || 'text';
        control = h('input', { id, name: f.name, type, placeholder: f.placeholder, step: f.type === 'datetime' ? 60 : null });
        control.value =
          f.type === 'datetime' ? toLocalInput(v) : f.type === 'tags' ? (v || []).join(', ') : v ?? (f.default ?? '');
      }
      if (f.required && control.tagName !== 'DIV') control.required = true;
      controls[f.name] = control;

      const label = h('label', { for: f.type === 'image' ? `${id}` : id, text: f.label + (f.required ? ' *' : '') });
      if (f.type === 'checkbox') {
        return h('div', { class: 'field field--check' }, control, label, f.hint ? h('p', { class: 'field__hint', text: f.hint }) : null);
      }
      return h('div', { class: `field${f.wide ? ' field--wide' : ''}` }, label, control, f.hint ? h('p', { class: 'field__hint', text: f.hint }) : null);
    });

    const save = h('button', { type: 'submit', class: 'abtn abtn--primary', text: submitLabel });
    const form = h(
      'form',
      { class: 'modal__form', method: 'dialog', novalidate: false },
      h('h2', { class: 'modal__title', text: title }),
      h('div', { class: 'fields' }, rows),
      error,
      h('div', { class: 'modal__actions' }, h('button', { type: 'button', class: 'abtn', text: 'Cancel', onclick: () => dialog.close() }), save),
    );
    const dialog = h('dialog', { class: 'modal' }, form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const out = {};
      for (const f of fields) {
        if (f.type === 'heading') continue;
        const c = controls[f.name];
        if (f.type === 'checkbox') out[f.name] = c.checked;
        else if (f.type === 'image') out[f.name] = { previous: values[f.name] || null, file: c._file.files[0] || null, remove: c._remove.checked };
        else if (f.type === 'tags') out[f.name] = c.value.split(',').map((t) => t.trim()).filter(Boolean);
        else if (f.type === 'number') out[f.name] = c.value === '' ? null : Number(c.value);
        else if (f.type === 'datetime') out[f.name] = c.value ? new Date(c.value).toISOString() : null;
        else out[f.name] = blankToNull(c.value);
      }
      save.disabled = true;
      save.textContent = 'Saving';
      error.textContent = '';
      try {
        await onSubmit(out);
        dialog.close('saved');
      } catch (err) {
        error.textContent = err.message || String(err);
        save.disabled = false;
        save.textContent = submitLabel;
      }
    });
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'saved');
      dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

// Turn an image field value from formDialog into the path to store (uploading/removing as needed)
export async function resolveImage(value, folder) {
  if (!value) return null;
  if (value.file) {
    const path = await uploadImage(value.file, folder);
    await removeImage(value.previous);
    return path;
  }
  if (value.remove) {
    await removeImage(value.previous);
    return null;
  }
  return value.previous;
}

// ---------- Table ----------
export function table(columns, rows, actions) {
  if (!rows.length) return h('p', { class: 'admin-empty', text: 'Nothing here yet.' });
  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'atable' },
      h('thead', {}, h('tr', {}, ...columns.map((c) => h('th', { scope: 'col', text: c.label })), actions ? h('th', { scope: 'col', text: '' }) : null)),
      h(
        'tbody',
        {},
        ...rows.map((row) =>
          h(
            'tr',
            {},
            ...columns.map((c) => {
              const v = c.render ? c.render(row) : row[c.key];
              return h('td', { 'data-label': c.label }, v instanceof Node ? v : String(v ?? ''));
            }),
            actions ? h('td', { class: 'atable__actions' }, ...actions(row)) : null,
          ),
        ),
      ),
    ),
  );
}

export function thumb(path) {
  const src = mediaUrl(path);
  return src ? h('img', { class: 'thumb', src, alt: '', loading: 'lazy' }) : h('span', { class: 'thumb thumb--empty', 'aria-hidden': 'true' });
}

export function errorMessage(error) {
  if (!error) return '';
  if (error.code === '42501') return 'You do not have permission to do that. Only admins can change data.';
  if (error.code === '23505') return 'That already exists. Use a different value.';
  return error.message || 'Something went wrong. Try again.';
}
