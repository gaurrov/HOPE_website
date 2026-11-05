---
name: new-page
description: Checklist for adding a new public page to the HOPE site (e.g. /companies/). Use when creating any new top-level or inner page so it is built, linked from every menu and footer, and works in lite mode.
---

Add the page `$ARGUMENTS` (a folder name like `companies`) by doing every step below. Copy an existing inner page (`companies/index.html` or `alumni/index.html`) as the starting point rather than writing the HTML from scratch.

1. **HTML entry** `<name>/index.html`. Keep from the copied page:
   - the inline `<head>` script that adds `lite` or `full` to `<html>` (reads `localStorage['hope-lite']` and `prefers-reduced-motion`);
   - the JetBrains Mono font link, `theme-color` `#000000`, favicon;
   - the `site-head` header, the `#menu` nav (mark this page with `aria-current="page"`), the `inner-foot` footer with the `term-open` terminal button;
   - a `<script type="module" src="/src/pages/<name>.js">`.
2. **Page script** `src/pages/<name>.js`: import `initInner` (and `isLite` if needed) from `./inner.js`, which loads the shared styles, Lenis, the menu, the title reveal and the terminal. Put page-only CSS in `src/styles/<name>.css` and import it from the script. Heavy libraries (like Three.js) go behind a dynamic `import()` so other pages don't load them.
3. **Build input**: add the page to `build.rollupOptions.input` in `vite.config.js`, or it won't exist in `dist/`.
4. **Menus and footers**: add the link to the `#menu` list and the footer nav in every page: `index.html`, `batches/index.html`, `batches/view/index.html`, `alumni/index.html`, `companies/index.html` and the new page. Grep for an existing link (e.g. `href="/alumni/"`) to find them all.
5. **Terminal command**: in `src/modules/terminal.js`, add a help entry, a command that navigates to the page, and the folder in the `ls` output.
6. **Data**: public reads go in `src/lib/data.js` through the `run()` helper, which returns a fallback on error; only published rows come back because of RLS. Every list needs a written empty state.
7. **Docs**: add a row to the pages table in `README.md` and the page to the "Pages:" line in `reference.md`.
8. **Verify** with `/check-ui` on the new page: desktop, 375px and lite mode, with no console errors, then `npm run build`.

Follow the design rules in CLAUDE.md: dark tokens only, sentence case, no apply or join actions.
