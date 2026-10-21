// Student browser shared by the Batches and Alumni pages: search, filters, sort, grid/list view,
// student cards, a profile panel, project cards and a placements board. Text always via textContent.
import gsap from 'gsap';
import { el, safeUrl, emptyState } from './render.js';
import { employmentLine, formatPackage } from './data.js';
import { recordFrame, fillAllFrames, initials } from '../frames.js';
import { tilt } from '../modules/interact.js';

const lite = () => document.documentElement.classList.contains('lite');

function deal(nodes) {
  if (lite() || !nodes.length) return;
  gsap.from(nodes, { y: 50, autoAlpha: 0, duration: 0.6, stagger: { each: 0.03, max: 0.5 }, ease: 'power3.out' });
}

function tags(list, cls = 'tags', limit = Infinity) {
  const ul = el('ul', cls);
  list.slice(0, limit).forEach((t) => ul.append(el('li', '', t)));
  if (list.length > limit) ul.append(el('li', 'tags__more', `+${list.length - limit}`));
  return ul;
}

// ---------- Profile panel ----------
export function openProfile(s, projects = []) {
  const dialog = el('dialog', 'event-panel profile');
  dialog.setAttribute('aria-label', `${s.full_name}, profile`);
  const close = el('button', 'icon-btn icon-btn--round event-panel__close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  close.addEventListener('click', () => dialog.close());

  const head = el('div', 'profile__head');
  head.append(recordFrame({ path: s.photo_path, label: 'Photo', alt: s.full_name, className: 'profile__photo', initialsOf: s.full_name }));
  const who = el('div', 'profile__who');
  who.append(el('h3', 'profile__name', s.full_name));
  who.append(el('p', 'profile__batch', [s.batch?.name, s.is_alumni ? 'Alumni' : 'In training'].filter(Boolean).join(', ')));
  head.append(who);

  const body = el('div', 'event-panel__content');
  const job = employmentLine(s);
  if (job) {
    const card = el('div', 'profile__job');
    card.append(el('p', 'profile__job-line', job));
    if (s.package_lpa != null) card.append(el('p', 'profile__package', formatPackage(s.package_lpa)));
    body.append(card);
  }
  if (s.skills?.length) body.append(el('h4', 'profile__label', 'Skills'), tags(s.skills));
  if (s.certifications?.length) {
    const ul = el('ul', 'profile__certs');
    s.certifications.forEach((c) => ul.append(el('li', '', c)));
    body.append(el('h4', 'profile__label', 'Certifications'), ul);
  }
  const mine = projects.filter((p) => p.members?.some((m) => m.student?.id === s.id));
  if (mine.length) {
    const ul = el('ul', 'profile__projects');
    mine.forEach((p) => {
      const li = el('li');
      const role = p.members.find((m) => m.student?.id === s.id)?.role;
      li.append(el('strong', '', p.title), el('span', '', [role, p.tech?.slice(0, 3).join(', ')].filter(Boolean).join(', ')));
      ul.append(li);
    });
    body.append(el('h4', 'profile__label', 'Projects'), ul);
  }

  dialog.append(close, head, body);
  dialog.addEventListener('close', () => {
    dialog.remove();
    const url = new URL(location.href);
    url.searchParams.delete('student');
    history.replaceState(null, '', url);
  });
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  document.body.append(dialog);
  fillAllFrames(dialog);
  dialog.showModal();
  close.focus();
  const url = new URL(location.href);
  url.searchParams.set('student', s.id);
  history.replaceState(null, '', url);
}

// ---------- Cards and rows ----------
function studentCard(s, i, showBatch, onOpen) {
  const li = el('li', 'person');
  const btn = el('button', 'person__btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', `${s.full_name}. Open profile`);
  btn.append(recordFrame({ path: s.photo_path, label: 'Photo', alt: '', i, initialsOf: s.full_name }));
  if (s.package_lpa != null) btn.firstChild.append(el('span', 'person__badge', formatPackage(s.package_lpa)));
  if (s.is_featured) btn.firstChild.append(el('span', 'person__star', 'Top placement'));
  btn.append(el('span', 'person__name', s.full_name));
  if (showBatch && s.batch) btn.append(el('span', 'person__batch', s.batch.name));
  const job = employmentLine(s);
  btn.append(el('span', job ? 'person__job' : 'person__job person__job--none', job || (s.is_alumni ? 'Alumni' : 'In training')));
  if (s.skills?.length) btn.append(tags(s.skills, 'tags tags--small', 3));
  btn.addEventListener('click', () => onOpen(s));
  li.append(btn);
  tilt(li, btn.querySelector('.frame'));
  return li;
}

function studentRow(s, i, showBatch, onOpen) {
  const li = el('li', 'row');
  const btn = el('button', 'row__btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', `${s.full_name}. Open profile`);
  btn.append(
    recordFrame({ path: s.photo_path, label: 'Photo', alt: '', i, className: 'row__avatar', initialsOf: s.full_name }),
    el('span', 'row__name', s.full_name),
    el('span', 'row__batch', showBatch ? s.batch?.name || '' : (s.skills || []).slice(0, 3).join(', ')),
    el('span', 'row__job', employmentLine(s) || (s.is_alumni ? 'Alumni' : 'In training')),
    el('span', 'row__package', formatPackage(s.package_lpa)),
  );
  btn.addEventListener('click', () => onOpen(s));
  li.append(btn);
  return li;
}

// ---------- Browser: toolbar + results ----------
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'placed', label: 'Placed or working', test: (s) => !!s.company },
  { id: 'open', label: 'Not placed yet', test: (s) => !s.company },
  { id: 'top', label: 'Top placements', test: (s) => s.is_featured },
];

export function peopleBrowser(root, { showBatch = false, emptyText = 'No students to show yet.' } = {}) {
  let students = [];
  let projects = [];
  const state = { q: '', filter: 'all', sort: 'name', view: 'grid' };
  try {
    state.view = localStorage.getItem('hope-view') || 'grid';
  } catch {
    /* storage blocked */
  }

  const search = el('input', 'pb__search');
  Object.assign(search, { type: 'search', placeholder: 'Search by name, skill or company' });
  search.setAttribute('aria-label', 'Search students');
  const chips = el('div', 'pb__chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Filter');
  const chipBtns = FILTERS.map((f) => {
    const b = el('button', 'chip chip--small', f.label);
    b.type = 'button';
    b.addEventListener('click', () => {
      state.filter = f.id;
      draw(true);
    });
    chips.append(b);
    return b;
  });
  const sort = el('select', 'pb__sort');
  sort.setAttribute('aria-label', 'Sort');
  [['name', 'Name, A to Z'], ['package', 'Package, high to low']].forEach(([v, t]) => {
    const o = el('option', '', t);
    o.value = v;
    sort.append(o);
  });
  sort.addEventListener('change', () => {
    state.sort = sort.value;
    draw(true);
  });
  const viewBtns = ['grid', 'list'].map((v) => {
    const b = el('button', 'pb__view', v === 'grid' ? 'Grid' : 'List');
    b.type = 'button';
    b.addEventListener('click', () => {
      state.view = v;
      try {
        localStorage.setItem('hope-view', v);
      } catch {
        /* storage blocked */
      }
      draw(true);
    });
    return b;
  });
  const views = el('div', 'pb__views');
  views.setAttribute('role', 'group');
  views.setAttribute('aria-label', 'Layout');
  views.append(...viewBtns);
  const count = el('p', 'pb__count');
  count.setAttribute('aria-live', 'polite');
  const results = el('ul', 'pb__results');

  const bar = el('div', 'pb__bar');
  bar.append(search, chips, sort, views);
  root.replaceChildren(bar, count, results);

  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = search.value.trim().toLowerCase();
      draw(false);
    }, 120);
  });

  const open = (s) => openProfile(s, projects);

  function draw(animate) {
    chipBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(FILTERS[i].id === state.filter)));
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent.toLowerCase() === state.view)));
    sort.value = state.sort;
    const f = FILTERS.find((x) => x.id === state.filter);
    let list = students.filter(f.test);
    if (state.q) {
      list = list.filter((s) => [s.full_name, s.company, ...(s.skills || []), ...(s.certifications || [])].some((v) => (v || '').toLowerCase().includes(state.q)));
    }
    list = [...list].sort((a, b) =>
      state.sort === 'package' ? (b.package_lpa ?? -1) - (a.package_lpa ?? -1) || a.full_name.localeCompare(b.full_name) : a.full_name.localeCompare(b.full_name),
    );
    count.textContent = students.length ? `Showing ${list.length} of ${students.length}` : '';
    results.className = `pb__results pb__results--${state.view}`;
    if (!list.length) {
      results.replaceChildren(el('li', 'pb__empty', null));
      results.firstChild.append(emptyState(students.length ? 'No one matches that. Try another name or clear the filters.' : emptyText));
      return;
    }
    const make = state.view === 'list' ? studentRow : studentCard;
    results.replaceChildren(...list.map((s, i) => make(s, i, showBatch, open)));
    fillAllFrames(results);
    if (animate) deal([...results.children]);
  }

  return {
    set(nextStudents, nextProjects = []) {
      students = nextStudents;
      projects = nextProjects;
      draw(true);
      // Deep link: ?student=<id> opens that profile
      const id = new URLSearchParams(location.search).get('student');
      const s = id && students.find((x) => x.id === id);
      if (s) open(s);
    },
    open,
  };
}

// ---------- Projects ----------
export function projectCards(box, projects, onMember) {
  if (!projects.length) {
    box.replaceChildren(emptyState('Projects from this batch will be shown here.'));
    return;
  }
  box.replaceChildren(
    ...projects.map((p, i) => {
      const card = el('article', 'project');
      if (p.image_path) card.append(recordFrame({ path: p.image_path, label: 'Project', alt: '', i, className: 'project__img' }));
      const top = el('p', 'project__kind', p.kind === 'individual' ? 'Individual project' : 'Group project');
      if (p.is_featured) top.append(el('span', 'project__featured', 'Featured'));
      card.append(top, el('h3', 'project__title', p.title));
      if (p.summary) card.append(el('p', 'project__summary', p.summary));
      if (p.tech?.length) card.append(tags(p.tech, 'tags tags--code'));
      const members = [...(p.members || [])].filter((m) => m.student).sort((a, b) => (b.role === 'Lead') - (a.role === 'Lead'));
      if (members.length) {
        const team = el('ul', 'project__team');
        team.setAttribute('aria-label', 'Team');
        members.forEach((m) => {
          const li = el('li');
          const b = el('button', 'project__member');
          b.type = 'button';
          b.append(el('span', 'project__avatar', initials(m.student.full_name)), el('span', '', m.student.full_name + (m.role ? ` (${m.role})` : '')));
          b.addEventListener('click', () => onMember(m.student.id));
          li.append(b);
          team.append(li);
        });
        card.append(team);
      }
      const links = [['Code', p.repo_url], ['Live demo', p.demo_url]].filter(([, u]) => safeUrl(u || ''));
      if (links.length) {
        const row = el('p', 'project__links');
        links.forEach(([label, u]) => {
          const a = el('a', 'project__link', label);
          Object.assign(a, { href: safeUrl(u), target: '_blank', rel: 'noopener' });
          row.append(a);
        });
        card.append(row);
      }
      return card;
    }),
  );
  fillAllFrames(box);
  deal([...box.children]);
}

// ---------- Placements board ----------
export function placementsBoard(box, students, onOpen) {
  const placed = students.filter((s) => s.company).sort((a, b) => (b.package_lpa ?? -1) - (a.package_lpa ?? -1));
  if (!placed.length) {
    box.replaceChildren(emptyState('Placements from this batch will be shown here as offers come in.'));
    return;
  }
  const max = Math.max(...placed.map((s) => Number(s.package_lpa) || 0), 1);

  // Companies with how many from this batch joined each
  const byCompany = new Map();
  placed.forEach((s) => byCompany.set(s.company, (byCompany.get(s.company) || 0) + 1));
  const companies = el('ul', 'board__companies');
  companies.setAttribute('aria-label', 'Companies');
  [...byCompany.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => companies.append(el('li', '', n > 1 ? `${c} × ${n}` : c)));

  const list = el('ol', 'board');
  placed.forEach((s, i) => {
    const li = el('li', 'board__row');
    const b = el('button', 'board__btn');
    b.type = 'button';
    b.setAttribute('aria-label', `${s.full_name}, ${employmentLine(s)}${s.package_lpa != null ? `, ${formatPackage(s.package_lpa)}` : ''}. Open profile`);
    const bar = el('span', 'board__bar');
    bar.style.setProperty('--w', `${((Number(s.package_lpa) || 0) / max) * 100}%`);
    b.append(el('span', 'board__rank', String(i + 1).padStart(2, '0')), el('span', 'board__name', s.full_name), el('span', 'board__company', s.company), bar, el('span', 'board__package', formatPackage(s.package_lpa)));
    b.addEventListener('click', () => onOpen(s));
    li.append(b);
    list.append(li);
  });
  box.replaceChildren(companies, list);
  if (!lite()) gsap.from(list.querySelectorAll('.board__bar'), { scaleX: 0, transformOrigin: 'left', duration: 0.9, stagger: 0.04, ease: 'power3.out' });
}
