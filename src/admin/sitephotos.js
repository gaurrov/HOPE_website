// Site photos: fill the design slots (gallery, track cards, lab, split panels) without touching code.
import { supabase, mediaUrl } from '../lib/supabase.js';
import { photos } from '../photos.js';
import { h, toast, confirmAction, uploadImage, removeImage, errorMessage } from './ui.js';

const GROUPS = [
  { title: 'Gallery', hint: 'Intro letters, photo tunnel and the rotating hero ring. Wide event photos work best.', test: (s) => s.startsWith('gallery-') },
  { title: 'Track cards', hint: 'Keep the subject in the left half; text sits bottom-left.', test: (s) => s.startsWith('track-') },
  { title: 'The lab', hint: 'One wide photo of the lab. The line drawing is made from it automatically.', test: (s) => s === 'venue' },
  { title: 'Batch panels', hint: 'The diagonal split on the home page. Left is the first batch (text top-left), right is the second (text bottom-right).', test: (s) => s.startsWith('split-') },
];

export async function sitePhotosView(panel) {
  const box = h('div', { class: 'slots' });
  panel.replaceChildren(
    h('div', { class: 'panel__head' }, h('div', {}, h('h1', { class: 'panel__title', text: 'Site photos' }), h('p', { class: 'panel__intro', text: 'Photos used in the home page design. Each slot shows its name, which also appears on the placeholder frame on the site.' }))),
    box,
  );

  async function load() {
    const { data, error } = await supabase.from('site_media').select('slot, path');
    if (error) return toast(errorMessage(error), 'error');
    const current = Object.fromEntries(data.map((r) => [r.slot, r.path]));
    const slots = Object.keys(photos);
    box.replaceChildren(
      ...GROUPS.map((g) =>
        h(
          'section',
          { class: 'slots__group' },
          h('h2', { class: 'slots__title', text: g.title }),
          h('p', { class: 'panel__intro', text: g.hint }),
          h('ul', { class: 'slots__grid' }, ...slots.filter(g.test).map((slot) => slotCard(slot, current[slot]))),
        ),
      ),
    );
  }

  function slotCard(slot, path) {
    const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif', class: 'visually-hidden', id: `slot-${slot}` });
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const newPath = await uploadImage(file, 'site');
        const { error } = await supabase.from('site_media').upsert({ slot, path: newPath, updated_at: new Date().toISOString() });
        if (error) throw new Error(errorMessage(error));
        await removeImage(path);
        toast(`Photo set for ${slot}`);
        load();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    const src = mediaUrl(path);
    return h(
      'li',
      { class: 'slot' },
      h('div', { class: 'slot__img' }, src ? h('img', { src, alt: '', loading: 'lazy' }) : h('span', { text: 'Empty' })),
      h('code', { class: 'slot__name', text: slot }),
      h(
        'div',
        { class: 'slot__actions' },
        h('label', { class: 'abtn abtn--small', for: `slot-${slot}`, text: src ? 'Replace' : 'Upload' }),
        input,
        src
          ? h('button', {
              type: 'button',
              class: 'abtn abtn--small abtn--danger',
              text: 'Remove',
              onclick: async () => {
                if (!(await confirmAction(`Remove the photo from ${slot}?`, 'Remove'))) return;
                const { error } = await supabase.from('site_media').delete().eq('slot', slot);
                if (error) return toast(errorMessage(error), 'error');
                await removeImage(path);
                load();
              },
            })
          : null,
      ),
    );
  }

  load();
}
