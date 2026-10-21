// Card builders shared by the public pages. Text goes in via textContent, never innerHTML.
import { recordFrame } from '../frames.js';
import { employmentLine } from './data.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null && text !== '') node.textContent = text;
  return node;
}

// Only follow links that are plain web addresses
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

export function emptyState(text) {
  return el('p', 'empty', text);
}

export function mentorCard(m, i) {
  const li = el('li', 'mentor');
  li.append(
    recordFrame({ path: m.photo_path, label: 'Portrait', alt: m.full_name, i }),
    el('p', 'mentor__name', m.full_name),
    el('p', 'mentor__role', [m.role, m.department].filter(Boolean).join(', ')),
  );
  if (m.teaches?.length) {
    const tags = el('ul', 'mentor__tags');
    tags.setAttribute('aria-label', 'Teaches');
    m.teaches.forEach((t) => tags.append(el('li', '', t)));
    li.append(tags);
  }
  return li;
}

// Student or alumni card: photo, name, optional batch, and where they are placed or working
export function personCard(s, i, { showBatch = false } = {}) {
  const li = el('li', 'person');
  li.append(recordFrame({ path: s.photo_path, label: 'Photo', alt: s.full_name, i }), el('p', 'person__name', s.full_name));
  if (showBatch && s.batch) li.append(el('p', 'person__batch', s.batch.name));
  const job = employmentLine(s);
  if (job) li.append(el('p', 'person__job', job));
  return li;
}

// Top placements: big portrait, details revealed on hover (always visible on touch screens)
export function placementCard(s, i) {
  const li = el('li', 'placement');
  const frame = recordFrame({ path: s.photo_path, label: 'Photo', alt: s.full_name, i, className: 'placement__photo' });
  const info = el('div', 'placement__info');
  info.append(el('p', 'placement__name', s.full_name));
  if (s.company) info.append(el('p', 'placement__company', s.company));
  const extra = [s.package, s.batch?.name].filter(Boolean).join(', ');
  if (extra) info.append(el('p', 'placement__extra', extra));
  frame.append(info);
  li.append(frame);
  return li;
}

// HOPE team member (admin shown on the site)
export function teamCard(a, i) {
  const li = el('li', 'member');
  li.append(
    recordFrame({ path: a.photo_path, label: 'Portrait', alt: a.full_name, i }),
    el('p', 'member__name', a.full_name),
    el('p', 'member__role', a.designation || 'HOPE coordinator'),
  );
  return li;
}
