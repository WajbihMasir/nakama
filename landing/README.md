# Nakama landing page

A standalone, static marketing page for Nakama. Plain HTML, CSS, and a little vanilla JS: no build step, no framework.

```
landing/
├── index.html   # page markup (semantic sections)
├── styles.css   # design tokens + layout (light/dark via prefers-color-scheme)
├── script.js    # hero channel demo, deploy tabs, copy buttons
└── assets/      # logo mark, dithered logo, two real dashboard screenshots
```

## Preview

Open `landing/index.html` directly in a browser, or serve the folder:

```bash
bunx serve landing
# or
python -m http.server --directory landing 8000
```

All paths are relative, so it also works from GitHub Pages (e.g. `/nakama/landing/`).

## Notes

- Fonts: Newsreader (display), Geist (text), Geist Mono (code), loaded from Google Fonts.
- The hero demo is scripted. It respects `prefers-reduced-motion` (shows the final state) and works with the keyboard (arrow keys move between channel tabs).
- Screenshots come from `assets/` and `docs/website/public/screenshots/` in this repo.
