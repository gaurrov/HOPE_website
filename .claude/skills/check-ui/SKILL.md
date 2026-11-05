---
name: check-ui
description: Verify a HOPE UI change in a real browser (desktop, 375px phone width, lite/reduced-motion) with no console errors. Use after any visual or interaction change, before saying it works. There are no automated tests in this repo.
---

Check `$ARGUMENTS` (a page path like `/companies/`; default `/`).

1. `npm run lint` and `npm run build` must pass.
2. Start the dev server in the background: `npx vite --port 5173 --strictPort`. Wait until `curl -s -o /dev/null http://localhost:5173/` succeeds; the first start after a config change can take 15 seconds.
3. In a browser (the Playwright MCP tools, or a small Playwright script), check:
   - **desktop** 1440x900: screenshot, then exercise the change (hover, click, drag, scroll);
   - **phone** 390x844 with `isMobile`: screenshot, and confirm `document.documentElement.scrollWidth <= innerWidth`;
   - **lite mode** with `reducedMotion: 'reduce'`: the content must be visible and usable without animation;
   - **console**: no `pageerror` or console errors.
   Look at every screenshot before reporting.
4. Home page quirks:
   - the intro animation runs about 13 seconds; wait for `.intro` to disappear before screenshots;
   - Lenis smooth scroll lags behind `mouse.wheel`, so wait between wheel steps and re-measure positions;
   - for scroll-triggered sections, scroll there with the wheel rather than `scrollIntoView` so GSAP ScrollTrigger runs as a visitor would see it;
   - `?debug-intro` pauses the intro timeline.
5. WebGL pages (`/companies/`): launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader` so the globe renders headless.
6. Stop only the server you started. Find its PID with `Get-NetTCPConnection -LocalPort 5173` and stop that process; never kill all `node.exe` processes, because that also kills the MCP servers.
7. Report what you checked and anything that failed, with the evidence.
