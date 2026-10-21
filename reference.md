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

---

## Part 2: HOPE design system

### 2.1 Concept

HOPE is a programming training house, so the visual language comes from **a code editor's syntax
highlighting**. The reference builds on Google's four brand colours; HOPE builds on four syntax token
colours, one per letter of **H‑O‑P‑E**. The brand glyphs are programming punctuation: `{ } ; </> => ( ) #`.
The dark background is the midnight of an editor at 2 a.m., not pure black.

### 2.2 Colour tokens (`src/styles/tokens.css`)

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0D1330` | Page background (midnight) |
| `--ink-2` | `#161E45` | Raised surfaces, placeholder frames |
| `--paper` | `#EEF1F8` | Main text on ink; background of the one light section |
| `--muted` | `#8A93B8` | Secondary text (the "comment" colour) |
| `--h` | `#4FC3F7` | H, cyan (function names) |
| `--o` | `#FFB547` | O, amber (numbers) |
| `--p` | `#7EE081` | P, green (strings) |
| `--e` | `#FF6FA3` | E, pink (keywords) |

Rules:
- Each of H, O, P, E keeps its own colour wherever the wordmark appears.
- The four token colours appear **together** (as a gradient, a border or a glyph field) or as one
  colour per item in a list. Never pick one token as a site-wide accent.
- Body text is always `--paper` on `--ink`, or `--ink` on `--paper`.

### 2.3 Typography

| Family | Use |
|---|---|
| **Martian Mono** (wdth 112.5, wght 800) | The HOPE wordmark and code glyphs only |
| **Bricolage Grotesque** (variable, opsz 12–96, wght 400–800) | Headlines and body |

Type scale, fluid with `clamp()`:

| Step | Size | Weight | Use |
|---|---|---|---|
| `--step-hero` | clamp(5rem, 20vw, 18rem) | 800 mono | Wordmark |
| `--step-display` | clamp(3rem, 9vw, 8.5rem) | 800 | Section statements and pinned headings |
| `--step-h2` | clamp(2.25rem, 5vw, 4.5rem) | 700 | Card and panel titles |
| `--step-lead` | clamp(1.15rem, 1.6vw, 1.5rem) | 500 | Lead paragraphs |
| `--step-body` | 1.0625rem | 400 | Body |
| `--step-small` | 0.875rem | 500 | Meta, footer |

- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows.
- Display line-height 0.95 with tight negative tracking (−0.03em); body line-height 1.55.
- Keep line length under 70 characters (`max-width: 34ch` for leads).

### 2.4 Components

| Component | Spec |
|---|---|
| **Glow button** (`.btn`) | Pill. Ink fill, 1.5px border made from a conic gradient of the four tokens, and a blurred copy of the same gradient behind it as a glow. On hover the gradient rotates (`@property --angle`). The label names the action: "Apply for the next batch", not "Submit". |
| **Icon button** (`.icon-btn`) | 44×44 rounded square (menu) or circle (prev/next, socials) with the same border and glow. |
| **Photo frame** (`[data-photo]`) | Every image slot on the site. With no photo, it renders a tinted placeholder that shows the slot name; with a photo, it renders an `<img>`. See "Adding photos" in `README.md`. |
| **Parallelogram card** (`.track`) | Full-bleed photo, cut with `clip-path` to a 10% skew so neighbouring cards interlock. Bottom gradient; title and copy bottom-left. |
| **Diagonal split** (`.split`) | Two panels cut at 60%→40% with a 6px gap. Left content is left-aligned and right content is right-aligned. |
| **Glyph** (`.glyph`) | Programming punctuation in Martian Mono, coloured with one of the four tokens. Used in the drop, the warp and around headings. |
| **Progress bar** | Fixed bottom centre, 40vw wide, 3px tall, with an H→O→P→E gradient fill tied to scroll. |
| **Menu overlay** | Full-screen ink layer revealed with a clip-path circle from the menu button. |

### 2.5 Page choreography (home)

| Reference beat | HOPE version | Module |
|---|---|---|
| Boot gate | Paper screen, four-colour **HOPE** wordmark, "House of Programming Expertise", **Enter HOPE**, "Skip the animations" | `intro.js` |
| Logo mask → tunnel | Letters fill with gallery photos, the page goes dark, the camera **zooms through the counter of the O**, and photos fly past in CSS 3D | `intro.js` |
| Hero ring | Curved cylinder of gallery photos rotating behind an extruded HOPE wordmark; scroll speeds it up | `ring.js` |
| Statement + physics | "Learn to code the way engineers do…" lines rise from a mask while code glyphs drop and bounce onto them | `statement.js` |
| About horizontal | **Tracks**: pinned horizontal strip of parallelogram cards, one per training track | `tracks.js` |
| Location → Save the date | **The lab → Next batch**: an edge-detected sketch of the lab fills with colour, then batch dates and an Apply CTA rise in | `venue.js` |
| Warp | A starfield of code glyphs streams outward, faster the further you scroll. It starts from ink because the lab section ends dark. | `warp.js` |
| Vibe heading + split | "Pick your side of the keyboard" crosses the screen, then a **Learn / Mentor** diagonal split | `paths.js` |
| Sponsors / partners | **People** behind HOPE (portrait frames), then a marquee of places alumni went | static + CSS |
| Footer | "See you in the lab", glow CTAs, extruded wordmark, socials, lite toggle | static |

### 2.6 Motion rules

1. **The intro is the only timed animation.** It runs after the visitor presses Enter, lasts under
   4 seconds, and scroll stays locked (`lenis.stop()`) until it finishes.
2. Everything else is **scrubbed** (`scrub: true` or a number) to scroll. No fade-in-on-enter for every
   block. If something moves, it is a pinned stage or a mask reveal.
3. Headings reveal with SplitText `mask: "lines"` (or `"chars"` for one-word headings), `yPercent: 100 → 0`.
4. Easing: `power3.out` for reveals, `power2.inOut` for camera moves, `none` for anything scrubbed linearly.
5. Pins use `end: "+=N%"` where N is about 100 per idea: horizontal strips are as long as their
   overflow, and sketch→photo takes 200%.
6. **Lite mode** (`html.lite`) is set by the intro link, the footer toggle (stored in `localStorage`)
   or `prefers-reduced-motion: reduce`. In lite mode there is no intro, no Lenis and no pins; tracks
   become a swipeable row and the warp section is hidden. Every page must stay fully readable in lite mode.

### 2.7 Image rules

- Every photo slot is a `[data-photo="slot-name"]` element. Never hard-code an `<img>` in a section.
- At least 1600px on the long edge, WebP or JPG, under 400 KB.
- Photos that carry text get the bottom gradient (`.frame--shade`).
- The **gallery** set (`gallery-01` … `gallery-12`) feeds the intro mask, the tunnel and the hero ring.
  Pick a mix of wide crowd shots and close-ups of people coding.
- The lab sketch is generated in the browser by an SVG edge-detection filter (`#sketch` in
  `index.html`), so whatever photo goes in `venue` gets its line-drawing version for free.

### 2.8 Rules for new pages

- Start from `--ink` with the fixed chrome: menu button, progress bar, prev/next.
- Give each page **one** pinned stage at most, unless it is the home page.
- Reuse the glow button, photo frame, parallelogram card and diagonal split before inventing new components.
- Check every new section at 375px wide and in lite mode.
