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
