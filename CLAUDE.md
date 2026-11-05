# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

HOPE (House of Programming Expertise) website for St. Joseph's College of Engineering: plain JavaScript (ES modules, no framework), Vite 8 multi-page build, GSAP + Lenis for motion, Three.js for the `/companies/` globe, Supabase for data and admin auth.

## Commands
- `npm run dev` (port 5173), `npm run build`, `npm run preview`, `npm run lint` (ESLint, `eslint.config.js`). There are no tests or formatter: verify changes with lint, a build, and checking the page in a browser (see `/check-ui`).
- Env: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (git-ignored; both are public by design). Never put a Supabase secret key in client code.

## Structure that isn't obvious
- Every page is its own HTML entry listed in `vite.config.js` (`home`, `batches`, `batch`, `companies`, `alumni`, `admin`). Adding a page means touching several files; use `/new-page`.
- `/batches/<slug>/` is served by the single template `batches/view/index.html`: a rewrite in `vercel.json` for production and the `hope-batch-pages` plugin in `vite.config.js` for dev/preview. Keep both in sync.
- `/hope-hq/` is the unlisted admin area (also opened by clicking the footer logo 5 times). Admin DOM is built with `h()` from `src/admin/ui.js`; simple tables use the `crudView(cfg)` pattern in `src/admin/crud.js`.
- Students link to companies by name string (`companyKey()` in `src/lib/data.js`), not by foreign key.

## Data and security (Supabase project `lnzpkbazdutogwwhasix`)
- Access is enforced by RLS, not the UI. Public tables use "read published" + "admins manage via `private.is_admin()`". Private student details (roll no, email, phone, notes) live in `student_private` and must never reach public pages.
- Mock rows carry `is_sample = true`; new sample data must too, and any new table with sample rows goes in `src/admin/sample.js`.
- Public pages show only database rows, never hard-coded people or figures. Placeholder photos from `public/photos` are attached in `src/lib/data.js` to `is_sample` rows only, so real records never show a stock image.
- Schema changes are applied through the Supabase MCP tools and then saved as a timestamped file in `supabase/migrations/`. Use `/db-change`.

## Design rules
- Neon dark theme: midnight navy page, near-white text, cyan/rose/amber/emerald brand colours (`--h`, `--o`, `--p`, `--e`) with gradients and soft glows. `src/styles/tokens.css` and `reference.md` §2.1 and §2.2 are current; older passages in `reference.md` that describe a white theme or a Google-colour palette are stale. Use tokens in new work and don't add new hues.
- JetBrains Mono only, sentence case, photos in full colour (the hero ring and lab sketch stay greyscale).
- No "apply", "join" or "become a mentor" actions anywhere: the college selects batches and assigns mentors.
- Every page must work in lite mode (`html.lite`, set by `prefers-reduced-motion` or the footer toggle) and at 375px wide with no sideways scroll.
- Don't put CSS transitions on properties that GSAP also animates on the same element (this once left the home batch panels blank); put hover effects on an inner wrapper.

## Git and deploys
- Branches: `main` is production; `development` deploys to the public dev site (hope-dev-beta.vercel.app) via `.github/workflows/deploy-dev.yml`. Vercel git deploys are disabled (`git.deploymentEnabled: false`).
- Never push to `main`. Commit only when asked, and always ask before pushing to `development`.
- Commit messages use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).
