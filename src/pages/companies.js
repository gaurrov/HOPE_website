// /companies/: the company globe plus a list that does everything the globe does (keyboard, screen readers, phones).
import '../styles/globe.css';
import { initInner, isLite } from './inner.js';
import { getCompanyMap, formatPackage } from '../lib/data.js';
import { openProfile } from '../lib/people.js';
import { initials } from '../frames.js';
import { mediaUrl } from '../lib/supabase.js';

const stage = document.querySelector('.globe');
const trail = document.querySelector('.gpanel__trail');
const body = document.querySelector('.gpanel__body');

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const studentsIn = (city) => city.companies.reduce((n, c) => n + c.students.length, 0);
const place = (c) => [c.city, c.country].filter(Boolean).join(', ');
const studentMeta = (s) => [s.batch?.name, formatPackage(s.package_lpa)].filter(Boolean).join(', ');

// Small round face: photo when there is one, initials otherwise
function face(s, cls) {
  const f = el('span', cls);
  const src = mediaUrl(s.photo_path);
  if (src) {
    const img = el('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    f.append(img);
  } else f.textContent = initials(s.full_name);
  return f;
}

// ---------- Labels floating on the globe ----------
const label = {
  home(h) {
    const n = el('span', 'gl__in');
    n.append(el('span', 'gl__dot'), el('span', 'gl__text', h.name));
    return n;
  },
  city(c, students) {
    const n = el('span', 'gl__in');
    const t = el('span', 'gl__text');
    t.append(el('b', '', c.name), el('small', '', `${plural(c.companies.length, 'company', 'companies')}, ${plural(students, 'student')}`));
    n.append(el('span', 'gl__dot'), t);
    return n;
  },
  company(c) {
    const n = el('span', 'gl__in');
    const t = el('span', 'gl__text');
    t.append(el('b', '', c.name), el('small', '', plural(c.students.length, 'student')));
    n.append(el('span', 'gl__dot'), t);
    return n;
  },
  student(s) {
    const n = el('span', 'gl__in');
    const t = el('span', 'gl__text');
    t.append(el('b', '', s.full_name));
    const meta = studentMeta(s);
    if (meta) t.append(el('small', '', meta));
    n.append(face(s, 'gl__face'), t);
    return n;
  },
};

// ---------- The list beside the globe ----------
let data = { cities: [], missing: [] };
let globe = null;
let view = { level: 'globe', city: null, company: null };

const findCity = (key) => data.cities.find((c) => c.key === key);
const findCompany = (id) => data.cities.flatMap((c) => c.companies).find((c) => c.id === id);

function go(next) {
  // The globe drives the list when it exists; without WebGL the list moves on its own
  if (!globe) return show(next);
  if (next.level === 'globe') globe.reset();
  else if (next.level === 'city') globe.focusCity(next.city);
  else globe.focusCompany(next.company);
}

function crumbs() {
  const items = [];
  if (view.level !== 'globe') items.push(['All cities', { level: 'globe' }]);
  if (view.level === 'company' && findCity(view.city)?.companies.length > 1) items.push([findCity(view.city).name, { level: 'city', city: view.city }]);
  trail.replaceChildren(
    ...items.map(([text, to]) => {
      const b = el('button', 'gpanel__crumb', text);
      b.type = 'button';
      b.addEventListener('click', () => go(to));
      return b;
    }),
  );
}

function companyButton(c) {
  const b = el('button', 'gco');
  b.type = 'button';
  b.append(el('span', 'gco__name', c.name), el('span', 'gco__count', plural(c.students.length, 'student')));
  b.addEventListener('click', () => go({ level: 'company', company: c.id }));
  return b;
}

function show(next) {
  view = next;
  crumbs();
  if (view.level === 'globe') {
    const out = [el('h2', 'gpanel__title', 'Companies')];
    if (!data.cities.length) out.push(el('p', 'gpanel__note', 'Companies will appear here once admins add them with a location.'));
    for (const city of data.cities) {
      const box = el('section', 'gcity');
      const head = el('button', 'gcity__head');
      head.type = 'button';
      head.append(el('span', 'gcity__name', city.name), el('span', 'gcity__meta', `${city.country ? `${city.country}, ` : ''}${plural(studentsIn(city), 'student')}`));
      head.addEventListener('click', () => go({ level: 'city', city: city.key }));
      const ul = el('ul', 'gcity__list');
      city.companies.forEach((c) => {
        const li = el('li');
        li.append(companyButton(c));
        ul.append(li);
      });
      box.append(head, ul);
      out.push(box);
    }
    if (data.missing.length) {
      const box = el('section', 'gmissing');
      box.append(el('h3', 'gmissing__title', 'Not on the map yet'), el('p', 'gpanel__note', 'These companies have students but no location yet. Admins can add one in the Companies section.'));
      const ul = el('ul', 'gmissing__list');
      data.missing.forEach((c) => {
        const li = el('li');
        li.append(el('span', '', c.name), el('span', 'gco__count', plural(c.students.length, 'student')));
        ul.append(li);
      });
      box.append(ul);
      out.push(box);
    }
    body.replaceChildren(...out);
    return;
  }
  if (view.level === 'city') {
    const city = findCity(view.city);
    const ul = el('ul', 'gcity__list');
    city.companies.forEach((c) => {
      const li = el('li');
      li.append(companyButton(c));
      ul.append(li);
    });
    body.replaceChildren(el('h2', 'gpanel__title', city.name), el('p', 'gpanel__note', `${city.country ? `${city.country}. ` : ''}${plural(city.companies.length, 'company', 'companies')}, ${plural(studentsIn(city), 'student')}.`), ul);
    return;
  }
  const c = findCompany(view.company);
  const out = [el('h2', 'gpanel__title', c.name), el('p', 'gpanel__note', place(c))];
  if (c.website) {
    const a = el('a', 'gpanel__link', 'Company website');
    a.href = c.website;
    a.target = '_blank';
    a.rel = 'noopener';
    out.push(a);
  }
  const ul = el('ul', 'gstudents');
  c.students.forEach((s) => {
    const b = el('button', 'gstu');
    b.type = 'button';
    const t = el('span', 'gstu__text');
    t.append(el('span', 'gstu__name', s.full_name));
    const meta = studentMeta(s);
    if (meta) t.append(el('span', 'gstu__meta', meta));
    b.append(face(s, 'gstu__face'), t);
    b.addEventListener('click', () => openProfile(s));
    const li = el('li');
    li.append(b);
    ul.append(li);
  });
  out.push(el('h3', 'gpanel__sub', plural(c.students.length, 'student')), c.students.length ? ul : el('p', 'gpanel__note', 'No students listed here yet.'));
  body.replaceChildren(...out);
}

// ---------- Readout ----------
const readout = Object.fromEntries([...document.querySelectorAll('[data-r]')].map((d) => [d.dataset.r, d]));
const coord = (v, pos, neg) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? pos : neg}`;

async function start() {
  data = await getCompanyMap();
  const companies = data.cities.reduce((n, c) => n + c.companies.length, 0);
  readout.companies.textContent = companies;
  readout.cities.textContent = data.cities.length;
  readout.students.textContent = data.cities.reduce((n, c) => n + studentsIn(c), 0);
  show({ level: 'globe' });

  const { createGlobe } = await import('../modules/globe.js');
  globe = createGlobe(stage, {
    cities: data.cities,
    lite: isLite(),
    label,
    onChange: (state) => show(state),
    onStudent: (s) => openProfile(s),
  });
  await initInner();
  if (!globe) {
    stage.classList.add('is-flat');
    stage.querySelector('.globe__fallback').hidden = false;
    return;
  }
  let lastText = '';
  globe.onReadout(({ lat, lng }) => {
    const text = `${coord(lat, 'N', 'S')}, ${coord(lng, 'E', 'W')}`;
    if (text !== lastText) readout.coords.textContent = lastText = text;
  });
  document.querySelectorAll('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      const z = b.dataset.zoom;
      if (z === 'reset') globe.reset();
      else globe.zoomBy(z === 'in' ? 0.78 : 1.28);
    }),
  );
  globe.intro();
}

start();
