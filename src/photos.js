// Photo manifest.
// 1. Put image files in /public/photos (e.g. public/photos/lab-01.jpg)
// 2. Write the file name next to the slot you want it in.
// Any slot left as '' shows a placeholder frame with the slot name on it.

export const photos = {
  // Gallery: intro letters, photo tunnel and hero ring (wide shots work best)
  'gallery-01': 'gallery-01.jpg',
  'gallery-02': 'gallery-02.jpg',
  'gallery-03': 'gallery-03.jpg',
  'gallery-04': 'gallery-04.jpg',
  'gallery-05': 'gallery-05.jpg',
  'gallery-06': 'gallery-06.jpg',
  'gallery-07': 'gallery-07.jpg',
  'gallery-08': 'gallery-08.jpg',
  'gallery-09': 'gallery-09.jpg',
  'gallery-10': 'gallery-10.jpg',
  'gallery-11': 'gallery-11.jpg',
  'gallery-12': 'gallery-12.jpg',

  // Tracks strip (portrait-ish crops, subject on the left half)
  'track-foundations': 'track-foundations.jpg',
  'track-dsa': 'track-dsa.jpg',
  'track-web': 'track-web.jpg',
  'track-cp': 'track-cp.jpg',
  'track-projects': 'track-projects.jpg',
  'track-placement': 'track-placement.jpg',

  // The lab. A wide photo of the room; the line-drawing version is generated automatically
  venue: 'venue.jpg',

  // The two batch panels in the diagonal split (left: first batch, right: second batch)
  'split-left': 'cohort-elite.jpg',
  'split-right': 'cohort-batch2.jpg',

  // Mentor, student and event photos are uploaded in the admin area
};

export const gallerySlots = Object.keys(photos).filter((k) => k.startsWith('gallery-'));
