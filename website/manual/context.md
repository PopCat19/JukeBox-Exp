# website/manual/

## Purpose

Static reference / documentation pages for the JukeBox site. All pages share
the same layout shell (defined in `subpages.css`) and the same typography
(`B612` for body, monospace for code blocks). No editor logic runs here.

## Files

- `subpages.css`, shared stylesheet, includes layout and `font-family` rules
- `*.html`, one per topic (FAQ, credits, features, …)
- `keybinds.html`, keyboard shortcut reference
- `leaderboard.html` + `leaderboard.js`, interactive community scores page
  (the only page with logic in this folder)

## Typography

All pages reference B612 from the self-hosted bundle:
`../assets/fonts/google/fonts.css`. The CSS file lives one level up so the
whole site shares a single font declaration source.
