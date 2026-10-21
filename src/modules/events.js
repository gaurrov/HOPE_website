// Event deck: Coming up / Past tabs, live countdown, draggable card deck, details panel, add-to-calendar.
import gsap from 'gsap';
import { formatDate, formatTime, dateParts } from '../lib/data.js';
import { el, safeUrl, emptyState } from '../lib/render.js';
import { recordFrame, fillAllFrames } from '../frames.js';
import { mediaUrl } from '../lib/supabase.js';
import { tilt } from './interact.js';

const lite = () => document.documentElement.classList.contains('lite');
const endOf = (e) => new Date(e.ends_at || new Date(new Date(e.starts_at).getTime() + 2 * 3600e3)).getTime();

// ---------- Add to calendar (.ics) ----------
const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
function downloadIcs(e) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HOPE//Events//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@hope`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(endOf(e))}`,
    `SUMMARY:${icsText(e.title)}`,
    e.venue ? `LOCATION:${icsText(e.venue)}` : '',
    e.summary || e.description ? `DESCRIPTION:${icsText(e.description || e.summary)}` : '',
    safeUrl(e.register_url || '') ? `URL:${safeUrl(e.register_url)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${e.title.replace(/[^\w]+/g, '-').toLowerCase()}.ics` });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Details panel ----------
function openDetails(e, past) {
  const dialog = el('dialog', 'event-panel');
  dialog.setAttribute('aria-labelledby', 'event-panel-title');
  const close = el('button', 'icon-btn icon-btn--round event-panel__close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  close.addEventListener('click', () => dialog.close());

  const poster = mediaUrl(e.poster_path);
  const media = poster ? Object.assign(el('img', 'event-panel__poster'), { src: poster, alt: '' }) : null;
  const title = el('h3', 'event-panel__title', e.title);
  title.id = 'event-panel-title';
  const when = [formatDate(e.starts_at), formatTime(e.starts_at) + (e.ends_at ? ` to ${formatTime(e.ends_at)}` : '')].join(', ');
  const meta = el('dl', 'event-panel__meta');
  meta.append(el('dt', '', 'When'), el('dd', '', when));
  if (e.venue) meta.append(el('dt', '', 'Where'), el('dd', '', e.venue));

  const body = el('div', 'event-panel__body');
  (e.description || e.summary || '').split(/\n{2,}/).filter(Boolean).forEach((para) => body.append(el('p', '', para)));

  const actions = el('div', 'event-panel__actions');
  const link = safeUrl(e.register_url || '');
  if (link && !past) {
    const a = el('a', 'btn');
    Object.assign(a, { href: link, target: '_blank', rel: 'noopener' });
    a.append(el('span', '', 'Register'));
    actions.append(a);
  }
  if (!past) {
    const cal = el('button', 'btn');
    cal.type = 'button';
    cal.append(el('span', '', 'Add to calendar'));
    cal.addEventListener('click', () => downloadIcs(e));
    actions.append(cal);
  }

  const content = el('div', 'event-panel__content');
  content.append(el('p', 'event-panel__tag', past ? 'Past event' : 'Coming up'), title, meta, body, actions);
  dialog.append(...[close, media, content].filter(Boolean));
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (ev) => ev.target === dialog && dialog.close()); // click the backdrop
  document.body.append(dialog);
  dialog.showModal();
  close.focus();
}

// ---------- Cards ----------
function card(e, i, past) {
  const li = el('li', 'deck__item');
  const btn = el('button', 'deck__card');
  btn.type = 'button';
  const { day, month } = dateParts(e.starts_at);
  const date = el('span', 'deck__date');
  date.append(el('span', 'deck__day', day), el('span', 'deck__month', month));
  const frame = recordFrame({ path: e.poster_path, label: past ? 'Event photo' : 'Event poster', alt: '', i, className: 'deck__poster' });
  frame.append(date);
  btn.append(frame, el('span', 'deck__title', e.title), el('span', 'deck__meta', [formatTime(e.starts_at), e.venue].filter(Boolean).join(', ')));
  btn.setAttribute('aria-label', `${e.title}, ${formatDate(e.starts_at)}. Open details`);
  btn.addEventListener('click', () => {
    if (btn.dataset.dragged) return;
    openDetails(e, past);
  });
  li.append(btn);
  return li;
}

// ---------- Drag to scroll (mouse); touch uses native swipe ----------
function draggable(deck) {
  let down = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let moved = false;
  deck.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true;
    moved = false;
    startX = lastX = e.clientX;
    startScroll = deck.scrollLeft;
    lastT = performance.now();
    velocity = 0;
    gsap.killTweensOf(deck);
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5 && !moved) {
      moved = true;
      deck.classList.add('is-dragging');
    }
    if (!moved) return;
    deck.scrollLeft = startScroll - dx;
    const now = performance.now();
    velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
    lastX = e.clientX;
    lastT = now;
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    deck.classList.remove('is-dragging');
    if (moved) {
      // Ignore the click that ends a drag, then glide with momentum
      deck.querySelectorAll('.deck__card').forEach((c) => (c.dataset.dragged = '1'));
      setTimeout(() => deck.querySelectorAll('.deck__card').forEach((c) => delete c.dataset.dragged), 0);
      gsap.to(deck, { scrollLeft: deck.scrollLeft - velocity * 320, duration: 0.9, ease: 'power3.out' });
    }
  });
}

export function setupEventDeck(events) {
  const section = document.querySelector('.events');
  const deck = section.querySelector('.deck');
  const track = section.querySelector('.deck__track');
  const tabs = [...section.querySelectorAll('.events__tab')];
  const next = section.querySelector('.events__next');
  const now = Date.now();

  const lists = {
    upcoming: events.filter((e) => endOf(e) >= now),
    past: events.filter((e) => endOf(e) < now).reverse(),
  };
  tabs.forEach((t) => (t.querySelector('.events__count').textContent = lists[t.dataset.list].length));

  function show(name, animate) {
    tabs.forEach((t) => {
      const on = t.dataset.list === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) deck.setAttribute('aria-labelledby', t.id);
    });
    const list = lists[name];
    const items = list.length
      ? list.map((e, i) => card(e, i, name === 'past'))
      : [el('li', 'deck__item deck__item--empty', null)];
    if (!list.length) {
      items[0].append(
        emptyState(name === 'past' ? 'Past events will be collected here.' : 'No events are scheduled right now. New sessions and contests show up here as soon as they are announced.'),
      );
    }
    track.replaceChildren(...items);
    fillAllFrames(track);
    deck.scrollLeft = 0;
    track.querySelectorAll('.deck__item').forEach((li) => {
      const c = li.querySelector('.deck__card');
      if (c) tilt(li, c, { max: 9, lift: 40 });
    });
    if (animate && !lite()) {
      gsap.from(track.children, { y: 60, rotation: (i) => (i % 2 ? 4 : -4), autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
    }
  }

  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.list, true)));
  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  section.querySelector('.events__tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const to = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    to.focus();
    show(to.dataset.list, true);
  });

  // Arrow buttons scroll by roughly one card
  const stepBy = (dir) => {
    const cardW = track.firstElementChild?.getBoundingClientRect().width || 300;
    gsap.to(deck, { scrollLeft: deck.scrollLeft + dir * (cardW + 20) * 2, duration: 0.7, ease: 'power3.out' });
  };
  section.querySelector('.deck__prev').addEventListener('click', () => stepBy(-1));
  section.querySelector('.deck__next').addEventListener('click', () => stepBy(1));
  draggable(deck);

  // Live countdown to the next event
  const upcoming = lists.upcoming;
  if (upcoming.length) {
    next.hidden = false;
    const e = upcoming[0];
    const tick = () => {
      const start = new Date(e.starts_at).getTime();
      const t = Date.now();
      next.replaceChildren();
      if (t >= start) {
        next.append('Happening now: ', el('strong', '', e.title));
        return;
      }
      let s = Math.floor((start - t) / 1000);
      const d = Math.floor(s / 86400);
      s %= 86400;
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      next.append('Next: ', el('strong', '', e.title), ' in ', el('span', 'events__clock', `${d}d ${hh}h ${mm}m ${ss}s`));
    };
    tick();
    setInterval(tick, 1000);
  }

  show(lists.upcoming.length || !lists.past.length ? 'upcoming' : 'past', false);
  return lists;
}
