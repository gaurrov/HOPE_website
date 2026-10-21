# HOPE website

Website for HOPE, the House of Programming Expertise. The design rules live in [`reference.md`](reference.md).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Branches and deploys

| Branch | Purpose | Deploys to |
|---|---|---|
| `development` | Day-to-day work. Every push deploys automatically. | Vercel project `hope-dev` via `.github/workflows/deploy-dev.yml` |
| `main` | Production. Changes arrive only by merging `development`. | Not wired up yet |

The workflow needs three repository secrets (Settings > Secrets and variables > Actions):
`VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_DEV_PROJECT_ID`. Vercel's own Git auto-deploys are
turned off in `vercel.json`, so GitHub Actions is the only thing that deploys.

## Adding photos

Every image on the site is a named slot. Until a slot has a file, it shows a tinted frame with
its slot name printed on it, so you can see which slot is which.

1. Put the image in `public/photos/`, for example `public/photos/lab.jpg`.
2. Open `src/photos.js` and add the file name to the slot: `venue: 'lab.jpg'`.
3. Save. The dev server reloads.

| Slots | Where they show | Tips |
|---|---|---|
| `gallery-01` … `gallery-12` | Intro letters, photo tunnel, hero ring | Wide event shots and close-ups of people coding. Landscape. |
| `track-*` | Cards in "What you'll learn" | Keep the subject in the left half, since text sits bottom-left |
| `venue` | "The lab" section | One wide photo of the lab. The line-drawing version is generated automatically. |
| `path-learn`, `path-mentors` | Learn / Mentors split | Learn has text at the top left; Mentors has text at the bottom right |

## Editing mentors

Mentors are assigned by the college, so the site only lists them. Edit `src/mentors.js`: each entry
has a `name`, `role`, `department`, `teaches` (shown as tags) and `photo` (a file name in `public/photos/`,
4:5 portrait). Add or remove entries and the grid updates.

Use JPG or WebP, at least 1600px on the long edge and under 400 KB each.

## Placeholder text to replace

Search for these in `index.html`: `Your College`, `hope@yourcollege.edu`, the batch dates and
room in the "Next batch" section, the `Company logo` slots, and the social
links (`href="#"`).

## Structure

```
index.html              all sections, in page order
src/main.js             boot: lite or full mode, Lenis + GSAP setup
src/photos.js           photo slot manifest
src/mentors.js          mentor list (name, role, topics, photo)
src/frames.js           fills [data-photo] slots
src/modules/intro.js    glitch loader, zoom through the O, photo tunnel
src/modules/hero.js     curved photo ring, 3D tilt and letter scatter on scroll
src/modules/scenes.js   statement, tracks, lab, join and mentors scroll scenes
src/modules/warp.js     glyph starfield canvas
src/modules/chrome.js   menu, progress bar, prev/next, anchors, lite toggle
src/styles/             tokens.css, base.css, components.css, sections.css
reference/screenshots/  captures of the reference site
```

**Lite mode** (no intro, no pinned scenes) turns on for visitors who use the footer toggle or have
reduced motion set in their OS.

**Intro timing** is set at the top of `src/modules/intro.js`: `GLITCH_MIN` and `GLITCH_MAX` (milliseconds).
