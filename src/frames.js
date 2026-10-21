import { photos } from './photos.js';
import { mediaUrl } from './lib/supabase.js';

const base = import.meta.env.BASE_URL;
const tones = ['h', 'o', 'p', 'e'];

// Photos uploaded by admins (Site photos tab) win over files listed in photos.js
let siteMedia = {};
export function setSiteMedia(map) {
  siteMedia = map || {};
}

export function photoUrl(slot) {
  if (siteMedia[slot]) return mediaUrl(siteMedia[slot]);
  const file = photos[slot];
  return file ? `${base}photos/${file}` : '';
}

// Fill one [data-photo] or [data-src] element with its image, or with a labelled placeholder.
export function fillFrame(el) {
  if (el.dataset.filled) return;
  el.dataset.filled = '1';
  el.classList.add('frame');

  const slot = el.dataset.photo;
  const real = el.dataset.src || (slot ? photoUrl(slot) : '');
  const src = real || (el.dataset.fallback ? base + el.dataset.fallback : '');

  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = el.dataset.alt || '';
    img.decoding = 'async';
    if (!el.closest('.hero, .intro')) img.loading = 'lazy';
    el.prepend(img);
    if (real) el.classList.add('has-photo');
    return;
  }

  const ph = document.createElement('span');
  ph.className = 'frame__ph';
  if (el.dataset.initials) {
    const initials = document.createElement('span');
    initials.className = 'frame__initials';
    initials.textContent = el.dataset.initials;
    ph.append(initials);
    el.classList.add('frame--person');
    el.append(ph);
    return;
  }
  const label = document.createElement('span');
  label.className = 'frame__label';
  label.textContent = el.dataset.label || 'Photo';
  ph.append(label);
  if (slot) {
    const code = document.createElement('code');
    code.className = 'frame__slot';
    code.textContent = slot;
    ph.append(code);
  }
  el.append(ph);
}

export function fillAllFrames(root = document) {
  root.querySelectorAll('[data-photo], [data-src]').forEach(fillFrame);
}

// Build a frame element for generated layouts (tunnel, ring).
export function makeFrame(slot, i, className) {
  const el = document.createElement('div');
  el.className = className;
  el.dataset.photo = slot;
  el.dataset.label = 'Gallery photo';
  el.dataset.tone = tones[i % 4];
  fillFrame(el);
  return el;
}

// Frame for a database record's photo (student, mentor, event poster)
export function recordFrame({ path, label, alt, i = 0, className = '', initialsOf = '' }) {
  const el = document.createElement('div');
  el.className = className;
  el.dataset.tone = tones[i % 4];
  el.dataset.label = label;
  el.dataset.alt = alt || '';
  if (initialsOf) el.dataset.initials = initials(initialsOf);
  const src = mediaUrl(path);
  if (src) el.dataset.src = src;
  fillFrame(el);
  return el;
}

// "Priya Lakshmi" → "PL"; titles like "Dr." are skipped
export function initials(name) {
  const parts = String(name).replace(/^(dr|mr|ms|mrs|prof)\.?\s+/i, '').split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}

// CSS background for a letter of the intro wordmark: a photo, or a tinted stripe pattern.
export function letterFill(slot, i) {
  const url = photoUrl(slot);
  if (url) return `url("${url}")`;
  const c = `var(--${tones[i % 4]})`;
  return `repeating-linear-gradient(135deg, ${c} 0 10px, color-mix(in srgb, ${c} 55%, var(--ink)) 10px 20px)`;
}
