import { photos } from './photos.js';

const base = import.meta.env.BASE_URL;
const tones = ['h', 'o', 'p', 'e'];

export function photoUrl(slot) {
  const file = photos[slot];
  return file ? `${base}photos/${file}` : '';
}

// Fill one [data-photo] element with its image, or with a labelled placeholder.
export function fillFrame(el) {
  if (el.dataset.filled) return;
  el.dataset.filled = '1';
  el.classList.add('frame');

  const slot = el.dataset.photo;
  const src = photoUrl(slot) || (el.dataset.fallback ? base + el.dataset.fallback : '');

  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = el.dataset.alt || '';
    img.decoding = 'async';
    if (!el.closest('.hero, .intro')) img.loading = 'lazy';
    el.prepend(img);
    if (photoUrl(slot)) el.classList.add('has-photo');
    return;
  }

  const ph = document.createElement('span');
  ph.className = 'frame__ph';
  ph.innerHTML = `<span class="frame__label">${el.dataset.label || 'Photo'}</span><code class="frame__slot">${slot}</code>`;
  el.append(ph);
}

export function fillAllFrames(root = document) {
  root.querySelectorAll('[data-photo]').forEach(fillFrame);
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

// CSS background for a letter of the intro wordmark: a photo, or a tinted stripe pattern.
export function letterFill(slot, i) {
  const url = photoUrl(slot);
  if (url) return `url("${url}")`;
  const c = `var(--${tones[i % 4]})`;
  return `repeating-linear-gradient(135deg, ${c} 0 10px, color-mix(in srgb, ${c} 55%, var(--ink)) 10px 20px)`;
}
