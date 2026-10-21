# HOPE website

Website for HOPE, the House of Programming Expertise. The design rules live in [`reference.md`](reference.md).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Pages

| Address | What it is |
|---|---|
| `/` | Home page (scroll story, events, mentors, company strip) |
| `/batches/` | One tab per batch; `/batches/?b=elite` opens a batch directly |
| `/alumni/` | Alumni with where they work, filterable by batch |
| `/hope-hq/` | **Admin area.** Not linked anywhere. Also opens by clicking the footer HOPE logo 5 times. Needs an admin login. |

## Data and the admin area (Supabase)

All content (events, batches, students, alumni, mentors, admins, photos) lives in the Supabase project
`lnzpkbazdutogwwhasix`. Admins manage it at `/hope-hq/`:

- **Events**: upcoming and past (decided by the date), with poster, venue and registration link.
- **Students**: public fields (name, photo, batch, company) plus admin-only fields (roll number, email, phone,
  department, year, job role, LinkedIn, notes). Import and export as CSV. Tick "Alumni" to list someone on the Alumni page.
- **Batches**, **Mentors**, **Site photos** (the design photo slots) and **Admins** (invite by email, remove).

Who can see what is enforced by the database (Row Level Security), not by the website code:

| Data | Public website | Admins |
|---|---|---|
| Events, batches, mentors, site photos | Published rows | Everything, can edit |
| Students | Name, photo, batch, company | Everything, can edit |
| Student private details, admin list | Never | Everything, can edit |

Schema: `supabase/migrations/`. Invite/remove admins: `supabase/functions/manage-admins/` (Edge Function).

### Environment variables

The site needs two values at build time (both are public by design; the database rules protect the data):

```
VITE_SUPABASE_URL=https://lnzpkbazdutogwwhasix.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Locally they live in `.env.local` (git-ignored). On Vercel they are set on the `hope-dev` project.
For the college server, put them in `.env.production.local` before running `npm run build`, then serve `dist/`
with any web server.

## Branches and deploys

| Branch | Purpose | Deploys to |
|---|---|---|
| `development` | Day-to-day work. Every push deploys automatically. | Vercel project `hope-dev` via `.github/workflows/deploy-dev.yml` |
| `main` | Production. Changes arrive only by merging `development`. | Not wired up yet |

The workflow needs three repository secrets (Settings > Secrets and variables > Actions):
`VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_DEV_PROJECT_ID`. Vercel's own Git auto-deploys are
turned off in `vercel.json`, so GitHub Actions is the only thing that deploys.

## Adding photos

Every design image on the home page is a named slot. Until a slot has a file, it shows a tinted frame with
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

The easiest way is **Admin → Site photos**: upload a photo per slot, no code change needed. Files listed in
`src/photos.js` are a fallback. Student, mentor and event photos are uploaded on their own admin screens.

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
src/lib/                Supabase client, public data queries, card builders
src/pages/              batches and alumni page scripts
src/admin/              admin area (sign-in, events, students + CSV, batches, mentors, site photos, admins)
batches/ alumni/ hope-hq/  page HTML for the inner pages and the admin area
supabase/               database migration and Edge Function source
src/frames.js           fills [data-photo] slots
src/modules/intro.js    glitch loader, zoom through the O, photo tunnel
src/modules/hero.js     curved photo ring, 3D tilt and letter scatter on scroll
src/modules/scenes.js   statement, tracks, lab, join and mentors scroll scenes
src/modules/events.js   event deck: tabs, countdown, drag, details panel, .ics
src/modules/glyphfield.js  cursor-reactive glyph canvas behind events
src/modules/interact.js glyphs dodge the cursor, 3D card tilt
src/modules/terminal.js the backtick terminal
src/modules/chrome.js   menu, progress bar, prev/next, anchors, lite toggle
src/styles/             tokens.css, base.css, components.css, sections.css
reference/screenshots/  captures of the reference site
```

**Terminal**: press `` ` `` on any public page (or the footer "Terminal" button) and type `help`. Commands live in `src/modules/terminal.js`.

**Lite mode** (no intro, no pinned scenes) turns on for visitors who use the footer toggle or have
reduced motion set in their OS.

**Intro timing** is set at the top of `src/modules/intro.js`: `GLITCH_MIN` and `GLITCH_MAX` (milliseconds).
