// HOPE admin area. Unlisted address, but the real protection is the login plus database rules:
// every read of private data and every write is checked against the admins table by Postgres RLS.
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/admin.css';

import { supabase } from '../lib/supabase.js';
import { h, toast, errorMessage } from './ui.js';
import { eventsView, batchesView, mentorsView } from './crud.js';
import { studentsView } from './students.js';
import { adminsView } from './admins.js';
import { sitePhotosView } from './sitephotos.js';
import { projectsView } from './projects.js';
import { sampleDataView } from './sample.js';

const app = document.getElementById('app');
const linkType = window.__authLinkType; // 'invite' or 'recovery' when opened from an email
const returnUrl = `${location.origin}/hope-hq/`;

function wordmark() {
  return h('a', { class: 'wordmark admin-mark', href: '/', 'aria-label': 'HOPE website' }, ...['h', 'o', 'p', 'e'].map((c) => h('span', { class: `t-${c}`, text: c.toUpperCase() })));
}

function card(title, ...content) {
  return h('main', { class: 'auth' }, h('div', { class: 'auth__card' }, wordmark(), h('h1', { class: 'auth__title', text: title }), ...content));
}

function field(label, attrs) {
  const id = `a-${attrs.name}`;
  return h('div', { class: 'field' }, h('label', { for: id, text: label }), h('input', { id, ...attrs }));
}

// ---------- Screens ----------
function signInScreen(message = '') {
  const error = h('p', { class: 'modal__error', role: 'alert', text: message });
  const submit = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--block', text: 'Sign in' });
  const form = h(
    'form',
    { class: 'auth__form' },
    field('Email', { name: 'email', type: 'email', autocomplete: 'username', required: true }),
    field('Password', { name: 'password', type: 'password', autocomplete: 'current-password', required: true }),
    error,
    submit,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true;
    error.textContent = '';
    const { error: err } = await supabase.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
    submit.disabled = false;
    if (err) error.textContent = err.message === 'Invalid login credentials' ? 'That email and password don\'t match an account.' : err.message;
  });
  const forgot = h('button', { type: 'button', class: 'linkbtn', text: 'Forgot your password?', onclick: () => forgotScreen(form.email.value) });
  app.replaceChildren(card('Admin sign in', form, forgot));
  form.email.focus();
}

function forgotScreen(email = '') {
  const note = h('p', { class: 'auth__note', role: 'status' });
  const submit = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--block', text: 'Send reset link' });
  const form = h('form', { class: 'auth__form' }, field('Email', { name: 'email', type: 'email', required: true, value: email }), note, submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true;
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.value.trim(), { redirectTo: returnUrl });
    submit.disabled = false;
    note.textContent = error ? error.message : 'If that email belongs to an admin, a reset link is on its way. Open it on this device.';
  });
  app.replaceChildren(card('Reset your password', form, h('button', { type: 'button', class: 'linkbtn', text: 'Back to sign in', onclick: () => signInScreen() })));
}

function setPasswordScreen(onDone) {
  const error = h('p', { class: 'modal__error', role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--block', text: 'Save password' });
  const form = h(
    'form',
    { class: 'auth__form' },
    field('New password', { name: 'password', type: 'password', autocomplete: 'new-password', minlength: 10, required: true }),
    field('Type it again', { name: 'confirm', type: 'password', autocomplete: 'new-password', minlength: 10, required: true }),
    h('p', { class: 'field__hint', text: 'At least 10 characters.' }),
    error,
    submit,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.password.value !== form.confirm.value) {
      error.textContent = 'The two passwords don\'t match.';
      return;
    }
    submit.disabled = true;
    const { error: err } = await supabase.auth.updateUser({ password: form.password.value });
    submit.disabled = false;
    if (err) return (error.textContent = err.message);
    toast('Password saved');
    onDone();
  });
  app.replaceChildren(card('Set your password', form));
}

function notAdminScreen(email) {
  app.replaceChildren(
    card(
      'This account isn\'t an admin',
      h('p', { class: 'auth__note', text: `${email} is signed in, but it isn't on the HOPE admin list. Ask an existing admin to invite you.` }),
      h('button', { type: 'button', class: 'abtn abtn--block', text: 'Sign out', onclick: () => supabase.auth.signOut() }),
    ),
  );
}

// ---------- Dashboard ----------
function dashboard(user, me) {
  const tabs = [
    { id: 'events', label: 'Events', mount: eventsView },
    { id: 'students', label: 'Students', mount: studentsView },
    { id: 'projects', label: 'Projects', mount: projectsView },
    { id: 'batches', label: 'Batches', mount: batchesView },
    { id: 'mentors', label: 'Mentors', mount: mentorsView },
    { id: 'photos', label: 'Site photos', mount: sitePhotosView },
    { id: 'admins', label: 'Admins', mount: adminsView(user.id) },
    { id: 'sample', label: 'Sample data', mount: sampleDataView },
  ];
  const panel = h('section', { class: 'panel', tabindex: '-1' });
  const nav = h(
    'nav',
    { class: 'side', 'aria-label': 'Admin sections' },
    ...tabs.map((t) => h('a', { href: `#${t.id}`, class: 'side__link', 'data-tab': t.id, text: t.label })),
  );

  function show() {
    const id = location.hash.slice(1);
    const tab = tabs.find((t) => t.id === id) || tabs[0];
    nav.querySelectorAll('.side__link').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === tab.id));
    panel.replaceChildren(h('p', { class: 'admin-loading', text: 'Loading' }));
    tab.mount(panel);
    panel.focus({ preventScroll: true });
  }
  addEventListener('hashchange', show);

  app.replaceChildren(
    h(
      'header',
      { class: 'bar' },
      wordmark(),
      h('span', { class: 'bar__label', text: 'Admin' }),
      h('span', { class: 'bar__user', text: me.full_name || user.email }),
      h('a', { class: 'abtn abtn--small', href: '/', target: '_blank', rel: 'noopener', text: 'View site' }),
      h('button', { type: 'button', class: 'abtn abtn--small', text: 'Sign out', onclick: () => supabase.auth.signOut() }),
    ),
    h('div', { class: 'shell' }, nav, panel),
  );
  show();
}

// ---------- Routing by session ----------
let shown = '';
async function route(session) {
  if (!session) {
    shown = 'signin';
    return signInScreen();
  }
  const key = `user:${session.user.id}`;
  if (shown === key) return;
  shown = key;
  const { data: me, error } = await supabase.from('admins').select('*').eq('id', session.user.id).maybeSingle();
  if (error) return toast(errorMessage(error), 'error');
  if (!me) return notAdminScreen(session.user.email);
  dashboard(session.user, me);
}

if (!supabase) {
  app.replaceChildren(card('Not configured', h('p', { class: 'auth__note', text: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild.' })));
} else {
  let needsPassword = linkType === 'invite' || linkType === 'recovery';
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') needsPassword = true;
    // Defer so Supabase finishes its own work before we query (avoids a known deadlock in the callback)
    setTimeout(() => {
      if (needsPassword && session) {
        return setPasswordScreen(() => {
          needsPassword = false;
          shown = '';
          route(session);
        });
      }
      if (event === 'SIGNED_OUT') shown = '';
      route(session);
    }, 0);
  });
}
