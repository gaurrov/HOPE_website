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
