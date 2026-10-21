// Photo manifest.
// 1. Put image files in /public/photos (e.g. public/photos/lab-01.jpg)
// 2. Write the file name next to the slot you want it in.
// Any slot left as '' shows a placeholder frame with the slot name on it.

export const photos = {
  // Gallery: intro letters, photo tunnel and hero ring (wide shots work best)
  'gallery-01': '',
  'gallery-02': '',
  'gallery-03': '',
  'gallery-04': '',
  'gallery-05': '',
  'gallery-06': '',
  'gallery-07': '',
  'gallery-08': '',
  'gallery-09': '',
  'gallery-10': '',
  'gallery-11': '',
  'gallery-12': '',

  // Tracks strip (portrait-ish crops, subject on the left half)
  'track-foundations': '',
  'track-dsa': '',
  'track-web': '',
  'track-cp': '',
  'track-projects': '',
  'track-placement': '',

  // The lab. A wide photo of the room; the line-drawing version is generated automatically
  venue: '',

  // Learn / Mentor split
  'path-learn': '',
  'path-mentor': '',

  // People
  'person-1': '',
  'person-2': '',
  'person-3': '',
  'person-4': '',
};

export const gallerySlots = Object.keys(photos).filter((k) => k.startsWith('gallery-'));
