# HOPE frontend reference

This file is the single source of truth for how the HOPE (House of Programming Expertise)
website should look, move and scroll. It has two halves:

1. **Teardown** of the reference site, https://devfest.gdgchennai.in/, captured on 2026-10-21
   in a 1440×900 Chromium viewport. Screenshots are in `reference/screenshots/`.
2. **HOPE design system**: the tokens, components and motion rules derived from that teardown.
   When you build a new page or section, follow part 2. Use part 1 when you need to know why
   a rule exists.

Notation in part 1: **Observed** means I saw it in the live DOM or a screenshot. **Inferred** means
it's a reasonable reading of the evidence that I didn't confirm in source.

---

## Part 1: Teardown of devfest.gdgchennai.in

### 1.1 Stack

| Layer | What it uses | Evidence |
|---|---|---|
| Framework | Next.js App Router, built with Turbopack | `/_next/static/chunks/turbopack-*.js`, `self.__next_f` RSC payloads |
| Styling | Tailwind CSS (utility classes such as `bg-ink text-paper`, `max-sm:-translate-y-[8%]`) | class names |
| Smooth scroll | **Lenis** (`window.lenis`, `html.lenis`, `html.lenis-stopped` while the intro plays) | globals and `<html>` classes |
| Scroll choreography | **GSAP ScrollTrigger** with pinning (`.pin-spacer` wrappers around pinned sections) | DOM |
| Text splitting | Per-character and per-line spans that start at `translate(0%, 100%)` and slide up. This matches GSAP SplitText output, with `aria-hidden` on the pieces and the real text kept for screen readers. | inline styles, accessibility tree |
| 3D | **Three.js r185** (`window.__THREE__ = "185"`) on 3 WebGL2 canvases, plus one 2D canvas | canvas contexts |
| Font | Google Sans (variable, opsz 17–18, wght 400–700) for everything | computed styles |
| Images | Next `<Image>` serving WebP at `w=1080` and `w=1920`, `object-cover`, lazy-loaded | `img.currentSrc` |

### 1.2 Global chrome (present on every screen)

- **Black page** (`#000`) with off-white text (`#f0f0f0`, token `paper`). Colour comes only from the
  four Google brand colours (blue, red, yellow, green) and from photographs.
- **Top-right controls**: two square, rounded icon buttons (account, menu). Each has a thin
  multi-colour gradient border and a soft coloured glow. *Observed.*
- **Menu**: a fixed full-screen overlay revealed with `clip-path: circle(0 at x y)` growing out
  of the button. *Observed* (closed state is `circle(0px at 0px 0px)`).
- **Scroll progress bar**: a thin track centred along the bottom edge, about 50% of the viewport
  wide. The fill is a blue→red→yellow→green gradient that grows with page progress. *Observed in
  every scroll screenshot.*
- **Previous / next section buttons**: round glowing buttons in the bottom-left and bottom-right
  corners. A single "scroll down" button sits centred in the hero. *Observed.*
- **Page-transition curtain**: a fixed black layer at `z-index: 999`, parked at
  `clip-path: inset(0 0 100%)` and wiped across on route change. *Observed (parked state); wipe inferred.*
- **Lite version**: a footer toggle and an intro link ("I don't like animations") switch to a
  static version. Lite is a first-class mode, not an afterthought.

### 1.3 Scroll model

- Lenis smooths the native scroll and GSAP ScrollTrigger reads it, so pinned sections run on
  real scroll position. The page is 11,946px tall (about 13 viewports).
- Each wheel gesture travelled about one viewport (750px of wheel input gave roughly 938px of
  movement), and the position settled at section boundaries. That points to **section snapping**
  (Lenis or ScrollTrigger `snap`). *Inferred.*
- Pinned section lengths, measured as DOM height in viewports: Hero 1.0, Statement 0.64,
  About 2.87 (horizontal scroll), Location/Save the date 2.25, Vibe 3.61, warp 1.0. Sponsors,
  partners and footer are normal flow.

### 1.4 Section-by-section choreography

| # | Section | What happens | Screenshot |
|---|---|---|---|
| 0 | **Boot gate** | White screen with the brand logo in four colours. Primary button "Enter the DevFest experience", secondary text link "I don't like animations". Scroll is locked (`lenis-stopped`). | `01-boot-gate.png` |
| 1 | **Logo mask → tunnel** | After Enter, the logo's fill becomes a window showing event photos (the logo shape acts as a mask). The camera then zooms through the logo into black space, and photos fly past in 3D depth, coming at the viewer like a tunnel. About 3 seconds, not scroll-driven. | `02-logo-mask.png`, `03-photo-tunnel.png` |
| 2 | **Hero** | The photos settle into a **curved cylinder wall** wrapping around the camera and rotating slowly. In front: a huge extruded 3D wordmark (WebGL) and two glowing pill buttons ("Get tickets", "See Agenda"), with a round scroll-down button. | `04-hero-ring.png` |
| 3 | **Statement** | Three huge lines ("Get ready to join the / biggest tech festival. / Hosted by GDG Chennai.") revealed line by line. 3D brand shapes (blocks, brackets) **drop with physics** and pile up over the text. | `05-statement-physics.png` |
| 4 | **About (horizontal)** | Pinned. The "About DevFest" heading enters character by character, then a strip of **parallelogram photo cards** (skewed edges that interlock) moves sideways as you scroll down. Each card is a full-bleed photo with a dark bottom gradient, a bold title and a two-line description. | `06-about-horizontal.png`, `07-about-cards.png` |
| 5 | **Transition** | A grey-blue overlay rises over the last cards while the next heading ("Location") fades in large and blurred. | `08-transition-dim.png` |
| 6 | **Location → Save the date** | Pinned, and the only light section (sky-blue background). The venue photo first appears as an **edge-detected line drawing**, then fills in with colour. The heading swaps from "Location" to "Save the Date", and the date, a note and a CTA rise in over the photo. | `09-location-sketch.png`, `10-save-the-date.png` |
| 7 | **Warp** | The light sky drains to black from the bottom up, and a **starfield of brand glyphs** (hearts, plus signs, brackets, dots in the four colours) streams outward from the centre like hyperspace. | `11-warp-field.png` |
| 8 | **"What's your DevFest vibe?"** | Pinned. A single-line headline far wider than the viewport **moves right to left** across the screen while floating 3D brackets drift around it. | `12-vibe-heading.png` |
| 9 | **Present / Attend** | Two full-bleed photo panels separated by a **diagonal cut** (`clip-path: polygon(0 0, 60% 0, 40% 100%, 0 100%)` and its mirror, with a 4px gap). Large title, paragraph and a CTA on each side; the right side is right-aligned. | `13-diagonal-split.png` |
| 10 | **Sponsors** | Calm and centred. Tier labels (Platinum, Gold) with white monochrome logos. A floating 3D bracket keeps the visual language. | `14-sponsors.png` |
| 11 | **Community partners** | Infinite logo marquee. The list is duplicated, and the copy is `aria-hidden`. | — |
| 12 | **Footer** | "See you there!" with two glow buttons, an extruded 3D logo, a row of round glowing social buttons, small links and a disclaimer. | `15-footer.png` |

### 1.5 How images are used

- **Photos carry all the colour and emotion.** The UI is black and white; photographs supply warmth.
- Photos are **never shown as plain rectangles**. They appear as a logo mask, as panels flying in
  3D, on a curved cylinder, in skewed parallelograms, as an edge-detected sketch, or cut by a diagonal.
- Every photo that has text on it gets a **dark gradient from the bottom** for legibility, and the
  text sits bottom-left.
- The same small set of photos is **reused** across intro, hero and cards, so 10–15 good photos
  are enough for the whole site.
- Logos are monochrome white SVGs, so a mixed set of sponsor brands stays calm on black.

### 1.6 Motion principles drawn from the reference

1. **One opening show, then scroll is in charge.** Only the intro runs on a timer. Everything
   after it is scrubbed to scroll position, so the visitor controls the pace.
2. **Pin, then transform.** Each big idea gets a pinned stage where scroll drives one transformation:
   horizontal travel, sketch→photo, warp speed, or a heading crossing the screen.
3. **Text rises from a mask.** Headings arrive line by line or character by character, sliding up
   from behind a clip. Text never just fades in.
4. **Brand shapes as connective tissue.** The same small set of brand glyphs (brackets, dots) appears
   in the physics drop, the warp field, around the vibe heading and next to sponsors.
5. **Lite mode is a real mode.** The reference offers the opt-out before the first animation plays.

### 1.7 Scroll motion details (second pass, small wheel steps)

- **Wheel input is amplified.** A 120px wheel tick moved the page 150px (about 1.25×), and Lenis smooths the glide. *Observed.*
- **The hero tilts away.** Scrolling out of the hero pitches the photo cylinder towards the camera, so it
  curves like a bowl, while the 3D wordmark rises off the top. *Observed in frames between 0 and 450px.*
- **3D brackets persist across sections.** The same extruded bracket shapes appear over the statement and
  stay through the "About DevFest" heading. They tumble in 3D, drift at different depths and never stop moving. *Observed.*
- **The About strip takes over the wheel.** Inside About, vertical scroll position stayed at 1625px while
  wheel input moved the cards sideways, and the "next" button turned into a right arrow. *Observed; implementation inferred.*

---

## Part 2: HOPE design system

### 2.1 Concept

HOPE is a programming training house, so the site looks like **a code editor in dark mode**: one coding
typeface, pure black pages, white text. The brand glyphs are programming punctuation: `{ } ; </> => ( ) #`.

There is no colour in the interface. Photos are shown in black and white and come into colour when pointed at,
so they are the only colour on the page and only while someone engages with them. Brand shapes (the wordmark,
glyphs, event dates) use an **outline sticker**: black fill, white outline, hard white extrusion.

### 2.2 Colour tokens (`src/styles/tokens.css`)

| Token | Value | Role |
|---|---|---|
| `--paper` / `--bg` | `#000000` | Page background, everywhere |
| `--ink` / `--fg` | `#FFFFFF` | Text, outlines, extrusions, buttons, progress bar |
| `--mist` | `#161616` | Placeholder frames, quiet surfaces |
| `--grey` | `#8C8C8C` | Secondary glyphs, glitch ghost |
| `--muted` | `#A6A6A6` | Secondary text (8.3:1 on black) |
| `--line` | white at 18% | Hairlines, tracks, tag borders |
| `--on-photo` | `#FFFFFF` | Text on a photo, always over a `.frame--shade` gradient |
| `--h` `--o` `--p` `--e` | `#000000` | Fills for outlined shapes only (kept as separate tokens so a letter can be re-tinted later) |

The names describe roles, not colours: `--ink` is whatever draws text and outlines (white here) and `--paper`
is the page (black). Swapping their values is how the site switched from light to dark; keep using the roles.

Rules:
- Black and white only. Do not introduce an accent colour; use weight, size, outline, underline or inversion
  (black background, white text) for emphasis.
- Buttons are white-outlined pills that invert to white with black text on hover.
- Slide-in panels and dialogs separate from the page with a white edge, not a shadow (shadows disappear on black).
- Blend modes that add light (`screen`) replace ones that darken (`multiply`), e.g. the glitch ghosts and the lab sketch.
- Photos: `filter: grayscale(1)` by default, full colour on hover or focus of their card.

### 2.3 Typography

**JetBrains Mono** (variable, 400–800, with italics) for everything: wordmark, headings, body, UI and the terminal.
Its programming ligatures render `=>`, `!=`, `&&` and `//` as single shapes, the way a code editor does.

Type scale, fluid with `clamp()`:

| Step | Size | Weight | Use |
|---|---|---|---|
| `--step-hero` | clamp(5rem, 22vw, 18rem) | 800 | Wordmark |
| `--step-display` | clamp(2.6rem, 7.5vw, 7rem) | 720 | Section statements and pinned headings |
| `--step-h2` | clamp(2rem, 4.2vw, 3.75rem) | 720 | Card and panel titles |
| `--step-lead` | clamp(1.05rem, 1.4vw, 1.3rem) | 500–600 | Lead paragraphs |
| `--step-body` | 1rem | 400 | Body (monospace runs wide, so it is a step smaller than a sans body) |
| `--step-small` | 0.875rem | 500 | Meta, footer |

- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows.
- Monospace is wide: keep leads to about 50ch and statements to about 17ch.
- To try another coding face, change `--font-mono` in `tokens.css` and the Google Fonts link in the four HTML files
  (good alternatives: IBM Plex Mono, Space Mono, Geist Mono, Fira Code).

### 2.4 Components

| Component | Spec |
|---|---|
| **Outline sticker** (`.wordmark--3d`, `.glyph--3d`) | White fill, `-webkit-text-stroke: 0.03em` black, five stacked black `text-shadow`s for the extrusion, plus one soft shadow. Same look as the loader. |
| **Button** (`.btn`) | Pill. White fill, 1.5px black border, faint shadow. Inverts to black with white text on hover. The label names the action, such as "See HOPE Elite". |
| **Icon button** (`.icon-btn`) | 44×44 rounded square (menu) or 52px circle (prev/next, socials) with the same border and glow. |
| **Photo frame** (`[data-photo]`) | Every image slot on the site. With no photo, it renders a light tinted placeholder that shows the slot name; with a photo, it renders an `<img>`. See "Adding photos" in `README.md`. |
| **Parallelogram card** (`.track`) | Full-bleed photo cut with `clip-path` to a 12% skew, 2.5vw apart. Bottom shade; white title and copy bottom-left. Swings in 3D as it crosses the screen. |
| **Diagonal split** (`.split`) | Two photo panels cut at 60%→40% with an 8px gap. Left content top-left; right content bottom-right and right-aligned. |
| **Mentor card** (`.mentor`) | 4:5 portrait frame, name, "role, department", and topic tags with token-colour borders. Rendered from the `mentors` table. Mentors are assigned by the college, so there is never an apply action. |
| **Progress bar** | Fixed bottom centre, 40vw wide, 3px tall, with an H→O→P→E gradient fill tied to scroll. |
| **Menu overlay** | Full-screen white layer revealed with a clip-path circle from the menu button. |

### 2.5 Page choreography (home)

| Reference beat | HOPE version | Module |
|---|---|---|
| Boot gate | **Glitch loader**, no buttons. The four-colour **HOPE** wordmark glitches (colour-split ghosts, a band that tears sideways, letters flickering into code characters) while the page loads: at least 3 s, until the `load` event, at most 5 s. Then it locks clean and the zoom starts. | `intro.js` |
| Logo mask → tunnel | Letters fill with gallery photos and the camera **zooms through the counter of the O** into a **photo corridor**, the same flow as the reference: 10 gallery photos line the left and right walls (alternating sides, turned 18° to face the centre line). The camera flies forward at a steady pace, so each photo **pops up** as a small thumbnail near the vanishing point (fading and growing in), gets bigger as it approaches and slides off to its own side as it passes. Photos never sit on the centre line, so they never stack. White **speed lines** streak out from the centre behind them. Tune `TUNNEL_PHOTOS`, `SPACING`, `FLIGHT` and the fade distances at the top of `intro.js` | `intro.js` |
| Hero ring | Black hero with no buttons: a curved cylinder of gallery photos rotating behind the sticker wordmark, standing on a **dark mirror floor**. Each panel has a flipped twin beneath it (30% opacity, 1px blur, masked out halfway down), a steel edge, and a **band of light** that slides across it as it turns past the front. The wordmark letters have a **chrome face** (`--chrome`) over their white outline and extrusion. On scroll the ring **tilts back** (rotateX) and the four letters **scatter in 3D**, each on its own path. Keep the metal subtle: grey steel, never shiny colour. Buttons share it through brushed-steel edges (`--chrome-stops`) and a steel fill on hover (`--chrome-pill`). | `hero.js` |
| Statement + 3D shapes | "Learn to code the way engineers do…": words **flip up** out of their lines (rotateX from −80°). Sticker glyphs float at different depths: near ones big, fast and spinning, far ones small, slow and blurred. Each also bobs gently on its own. | `scenes.js` |
| About horizontal | **Tracks**: pinned horizontal strip. Cards **swing round a curve** (rotateY −38° → 0° → 38°, pushed back in z at the edges) so the strip echoes the hero ring. | `scenes.js` |
| Location → Save the date | **The lab → Where HOPE trains**: an edge-detected sketch of the lab fills with colour, then the room, timings and the batch names rise in, with a link to the batches | `scenes.js` |
| Warp | **Events deck**: one section, no title-only screen. Coming up / Past tabs with counts, a live countdown to the next event, and a drag/swipe card deck. Cards tilt toward the cursor, and clicking one opens a side panel with Register and Add to calendar (.ics). A cursor-reactive glyph field sits behind it all. | `events.js`, `glyphfield.js` |
| Vibe heading + split | "Two batches. One lab." rides across the screen **on a wave** (each letter on a sine curve). Then the split slides together: **HOPE Elite** on the left, **HOPE Batch 2** on the right, each with live student and placement counts and a link to its batch page. | `scenes.js` |
| Sponsors / partners | **Top placements** wall (portraits dealt in from depth; details slide up on hover; the first card leads at double size), **Meet the mentors**, **The HOPE team** (admins who chose to appear), then a strip of companies | `scenes.js` + CSS |
| Footer | "See you in the lab", glow CTAs, sticker wordmark, socials, lite toggle | static |

### 2.6 Motion rules

1. **The intro is the only timed animation.** It starts by itself on page load: 3–5 s of glitch while
   the page loads, then about 4 s of zoom. Scroll stays locked (`lenis.stop()`) until it finishes.
2. Everything else is **scrubbed** (`scrub: true` or a number) to scroll. No fade-in-on-enter for every
   block. If something moves, it is a pinned stage, a mask reveal or a depth layer.
3. **Use depth, not just vertical movement.** Every stage gets a z-axis: a tilt (rotateX/rotateY), a
   scatter in z, or parallax layers. Use `perspective` 700–1400px on the stage and `transform-style: preserve-3d` on movers.
4. Headings reveal with SplitText `mask: "lines"` (or `"chars"`), `yPercent: 100 → 0`. Hero statements also flip words in with `rotationX`.
5. Smooth scroll: Lenis `lerp: 0.085`, `wheelMultiplier: 1.2`, so a flick glides about 1.2× its wheel distance, like the reference.
6. Easing: `power3.out` for reveals, `power2.inOut` for camera moves, `none` for anything scrubbed linearly.
7. Pins use `end: "+=N%"` where N is about 100 per idea: horizontal strips are as long as their
   overflow, and sketch→photo takes 200%. A pinned stage must never end on an empty screen; the next
   section rises over the last visible element.
8. An entrance tween and a scroll tween must never animate the same transform property on the same element.
   For example, the hero entrance uses `yPercent`/`scale` and the scroll scatter uses `x/y/z/rotation`.
9. **Lite mode** (`html.lite`) is set by the footer toggle (stored in `localStorage`)
   or `prefers-reduced-motion: reduce`. In lite mode there is no intro, no Lenis, no pins and no bobbing;
   tracks become a swipeable row and the warp section is hidden. Every page must stay fully readable in lite mode.

### 2.6a Interaction rules (the site must feel touchable)

1. **Symbols react to the pointer.** Every floating code glyph (statement, join, inner-page headers, the events
   field) is pushed away by the cursor or a dragging finger and springs back. DOM glyphs move on a `.glyph__push`
   wrapper; canvas glyphs use the spring in `glyphfield.js`.
2. **Grab things.** The hero ring spins when dragged (horizontal swipes on touch, with `touch-action: pan-y`), and the
   hero letters lean toward the cursor on a `.l__lean` wrapper. The event deck drags with momentum.
3. **Cards tilt.** Event, mentor and student cards tilt up to about 10° toward the cursor with a moving glare (`tilt()` in
   `interact.js`). This only runs on fine pointers with hover. Tilt always targets an inner element, never the element a
   scroll tween is animating.
4. **The terminal.** On every public page, the backtick key (or the footer "Terminal" button) opens a console with
   `help`, `events`, `next`, `batches <name>`, `alumni`, `mentors` and more. New pages should add their own command.
5. Interactions answer the user, so they may run instantly (no scrub). Everything is keyboard reachable, and none of it
   runs in lite mode.

### 2.7 Image rules

- Every photo slot is a `[data-photo="slot-name"]` element. Never hard-code an `<img>` in a section.
- At least 1600px on the long edge, WebP or JPG, under 400 KB.
- Photos that carry text get the bottom gradient (`.frame--shade`).
- The **gallery** set (`gallery-01` … `gallery-12`) feeds the intro mask, the tunnel and the hero ring.
  Pick a mix of wide crowd shots and close-ups of people coding.
- The lab sketch is generated in the browser by an SVG edge-detection filter (`#sketch` in
  `index.html`), so whatever photo goes in `venue` gets its line-drawing version for free.

### 2.8 Pages and data

- **Purpose:** HOPE presents itself; it does not take applications. The college selects batches and assigns mentors.
  Never add an apply, register-as-student or become-a-mentor action. Event registration links are the only outward CTA.

- Pages: `/` (home), `/batches/`, `/alumni/`, and the unlisted admin area `/hope-hq/`. Inner pages use the same
  header, menu and tokens, and get one calm motion moment only: the title rises by character, the header glyphs
  drift away and cards are dealt in.
- All content comes from Supabase. Public pages read only published rows and public columns; the database
  enforces this with RLS, so the UI never has to hide anything.
- Student cards show name, photo (or initials), batch, "Placed at …" or "Works at …", package, skills and
  certifications. Never put contact details, roll numbers, marks or profile links on a public page.
- Data pages follow one pattern (`src/lib/people.js`): live stat tiles, tabs, a toolbar (search, filter chips, sort,
  grid/list), results that can be dealt in, and a side panel for details. Every view is reachable by URL
  (`?b=`, `?tab=`, `?student=`). While data loads, stats show "..." and stale responses are ignored.
- Every list has a written empty state that says what will appear and when; never leave an empty grid.
- Admin UI follows the same tokens but is dense and calm: white panels on `--mist`, ink primary buttons, no scroll animation.

### 2.9 Rules for new pages

- Start from the white `--bg` with the fixed chrome: menu button, progress bar, prev/next.
- Give each page **one** pinned stage at most, unless it is the home page.
- Reuse the sticker glyph, glow button, photo frame, parallelogram card, diagonal split and mentor card before inventing new components.
- Check every new section at 375px wide and in lite mode.
