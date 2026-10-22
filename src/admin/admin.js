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

// Sign-in screens: the black-mirror HOPE wordmark on one side, the form on the other.
function card(title, ...content) {
  const mark = h('p', { class: 'auth__mark', 'aria-hidden': 'true' }, ...['H', 'O', 'P', 'E'].map((c) => h('span', { 'data-c': c, text: c })));
  return h(
    'main',
    { class: 'auth' },
    h(
      'section',
      { class: 'auth__brand' },
      mark,
      h('p', { class: 'auth__tag', text: 'Admin' }),
      h('p', { class: 'auth__about', text: 'Manage events, students, batches, mentors and photos on the HOPE website.' }),
    ),
    h(
      'section',
      { class: 'auth__card' },
      h('h1', { class: 'auth__title', text: title }),
      ...content,
      h('a', { class: 'auth__back', href: '/', text: 'Back to the website' }),
    ),
  );
}

function field(label, attrs, hint) {
  const id = `a-${attrs.name}`;
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id, text: label }),
    h('input', { id, ...attrs, 'aria-describedby': hint ? `${id}-hint` : null }),
    hint && h('p', { class: 'field__hint', id: `${id}-hint`, text: hint }),
  );
}

const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Password input with a show/hide button and a Caps Lock warning
function passwordField(label, attrs) {
  const id = `a-${attrs.name}`;
  const input = h('input', { id, type: 'password', ...attrs, 'aria-describedby': `${id}-caps` });
  const toggle = h('button', { type: 'button', class: 'pw__toggle', 'aria-label': 'Show password', 'aria-pressed': 'false', 'aria-controls': id });
  toggle.innerHTML = EYE;
  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.innerHTML = show ? EYE_OFF : EYE;
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    input.focus();
  });
  const caps = h('p', { class: 'field__caps', id: `${id}-caps`, 'aria-live': 'polite' });
  const checkCaps = (e) => {
    if (e.getModifierState) caps.textContent = e.getModifierState('CapsLock') ? 'Caps Lock is on.' : '';
  };
  input.addEventListener('keydown', checkCaps);
  input.addEventListener('keyup', checkCaps);
  input.addEventListener('blur', () => (caps.textContent = ''));
  const box = h('div', { class: 'field' }, h('label', { for: id, text: label }), h('div', { class: 'pw' }, input, toggle), caps);
  box.input = input;
  return box;
}

// Short usernames like "Admin@sjce" (no domain ending) map to internal accounts ending in .hope.local
const isUsername = (value) => /^[^@\s]+@[^@\s.]+$/.test(value.trim());
function toLoginEmail(value) {
  const v = value.trim().toLowerCase();
  return isUsername(v) ? `${v}.hope.local` : v;
}

// The username can be remembered on this device; it's a convenience, so storage failures are ignored
const REMEMBER = 'hope-admin-user';
const recall = () => {
  try {
    return localStorage.getItem(REMEMBER) || '';
  } catch {
    return '';
  }
};
const remember = (value) => {
  try {
    value ? localStorage.setItem(REMEMBER, value) : localStorage.removeItem(REMEMBER);
  } catch {}
};

function signInError(err) {
  if (err.message === 'Invalid login credentials') return 'The username or password is wrong. Check Caps Lock and try again.';
  if (err.status === 429 || /rate limit|too many/i.test(err.message)) return 'Too many tries. Wait a minute, then try again.';
  if (err.name === 'AuthRetryableFetchError' || /fetch|network/i.test(err.message)) return 'Can\'t reach the server. Check your internet connection and try again.';
  return err.message;
}

// ---------- Screens ----------
function signInScreen(message = '') {
  const saved = recall();
  const error = h('p', { class: 'auth__error', role: 'alert', text: message });
  const submit = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--block auth__submit' }, h('span', { text: 'Sign in' }));
  const password = passwordField('Password', { name: 'password', autocomplete: 'current-password', required: true });
  const keep = h('input', { type: 'checkbox', id: 'a-remember', name: 'remember', checked: Boolean(saved) });
  const form = h(
    'form',
    { class: 'auth__form', novalidate: true },
    field('Username or email', { name: 'email', type: 'text', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true, value: saved }),
    password,
    h('div', { class: 'field field--check' }, keep, h('label', { for: 'a-remember', text: 'Remember my username on this device' })),
    error,
    submit,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = form.email.value.trim();
    if (!user || !form.password.value) {
      error.textContent = !user ? 'Enter your username or email.' : 'Enter your password.';
      (!user ? form.email : form.password).focus();
      return;
    }
    submit.disabled = true;
    submit.classList.add('is-busy');
    submit.firstChild.textContent = 'Signing in';
    error.textContent = '';
    const { error: err } = await supabase.auth.signInWithPassword({ email: toLoginEmail(user), password: form.password.value });
    submit.disabled = false;
    submit.classList.remove('is-busy');
    submit.firstChild.textContent = 'Sign in';
    if (err) {
      error.textContent = signInError(err);
      form.password.value = '';
      form.password.focus();
      return;
    }
    remember(keep.checked ? user : '');
  });
  const forgot = h('button', { type: 'button', class: 'linkbtn', text: 'Forgot your password?', onclick: () => forgotScreen(form.email.value) });
  app.replaceChildren(card('Sign in', form, forgot));
  (saved ? form.password : form.email).focus();
}

function forgotScreen(email = '') {
  // Username accounts (like Admin@sjce) have no inbox, so a reset email can't reach them
  if (email && isUsername(email)) {
    app.replaceChildren(
      card(
        'Reset your password',
        h('p', { class: 'auth__note', text: `${email.trim()} is a username, not an email address, so a reset link can't be sent to it. Ask another HOPE admin to set a new password for you.` }),
        h('button', { type: 'button', class: 'abtn abtn--block', text: 'Back to sign in', onclick: () => signInScreen() }),
      ),
    );
    return;
  }
  const note = h('p', { class: 'auth__note', role: 'status' });
  const submit = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--block', text: 'Send reset link' });
  const form = h(
    'form',
    { class: 'auth__form' },
    field('Email', { name: 'email', type: 'email', autocomplete: 'email', required: true, value: email }, 'Reset links go to admins who signed up with an email address.'),
    note,
    submit,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true;
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.value.trim(), { redirectTo: returnUrl });
    submit.disabled = false;
    note.textContent = error ? signInError(error) : 'If that email belongs to an admin, a reset link is on its way. Open it on this device.';
  });
  app.replaceChildren(card('Reset your password', form, h('button', { type: 'button', class: 'linkbtn', text: 'Back to sign in', onclick: () => signInScreen() })));
  form.email.focus();
}

function setPasswordScreen(onDone) {
  const error = h('p', { class: 'modal__error', role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--block', text: 'Save password' });
  const form = h(
    'form',
    { class: 'auth__form' },
    passwordField('New password', { name: 'password', autocomplete: 'new-password', minlength: 10, required: true }),
    passwordField('Type it again', { name: 'confirm', autocomplete: 'new-password', minlength: 10, required: true }),
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
