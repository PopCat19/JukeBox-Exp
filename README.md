# JukeBox Exp (Experimental)

Browser-based tool for sketching and sharing instrumental music.
Forked from [JukeeBox/JukeBox_TypeScript](https://github.com/JukeeBox/JukeBox_TypeScript).
A mod of [Ultrabox](https://ultraabox.github.io) / [JummBox](https://github.com/jummbus/jummbox) / [BeepBox](https://beepbox.co).

**This is an unofficial fork.** Not affiliated with JukeeBox or upstream projects.
Experimental. Expect breaking changes.

Song data is encoded in the URL hash. Copy the URL to save and share.

## Compiling

Requires [Bun](https://bun.sh) or [Node.js](https://nodejs.org) (v18+). Licensed under MIT.

```
git clone https://dawn.wine/popcat19/JukeBox-Exp.git
cd JukeBox-Exp
bun install   # or: npm install
bun run build # or: npm run build
```

Builds synth, player, editor, and EditorConfig bundles via [esbuild](https://esbuild.github.io/) into `dist/`.

## Development

```
bun run dev              # or: npm run dev              # watch + auto-reload
bun run lint             # or: npm run lint             # biome + type-check + ESLint
bun run lint:fix         # or: npm run lint:fix         # biome format + safe fixes --write
bun run typecheck        # or: npm run typecheck        # tsc --noEmit (editor)
bun run typecheck:synth  # or: npm run typecheck:synth  # tsc --noEmit (synth)
bun run typecheck:player # or: npm run typecheck:player # tsc --noEmit (player)
bun run typecheck:all    # or: npm run typecheck:all    # all three targets
```

## Deployment

```
./scripts/deploy.sh   # builds, merges website/ assets into dist/, pushes gh-pages
```

GitHub Pages serves from the `gh-pages` branch.

## Architecture

| Directory | Purpose |
|-----------|---------|
| `synth/`  | Audio engine. Standalone, usable in other projects. |
| `editor/` | Song editor UI. |
| `player/` | Embeddable miniature player. |
| `shared/` | Shared event system and oscilloscope (upstream: `global/`). |
| `website/` | Static assets (HTML, images, samples, favicons). Source only, not build output. |
| `dist/`   | Build output (gitignored). |

## Dependencies

- [imperative-html](https://www.npmjs.com/package/imperative-html) - DOM construction
- [js-xxhash](https://npmjs.com/package/js-xxhash) - random envelope hashing
- [jQuery](https://code.jquery.com) + [Select2](https://select2.org/) - UI (CDN)
- [lamejs](https://www.npmjs.com/package/lamejs) - MP3 export (loaded on demand via [jsdelivr](https://www.jsdelivr.com/))

<!-- generated: 20260613-6eab3f32 -->
