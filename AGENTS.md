# AGENTS.md

## Project overview

Browser-based music sketching tool. Fork of JukeBox_TypeScript / Ultrabox / JummBox / BeepBox. Song data encoded in URL hash — copy URL to save/share.

Read `README.md` for the human-facing overview.

## Setup commands

```bash
bun install
bun run dev     # watch + auto-reload
bun run build   # production build
```

## Code style

- TypeScript + ESLint + Biome formatting
- Follows dev-mini conventions where applicable
- Module headers serve as in-code documentation

## README workflow

Edit `readme_manifest/*.md`, then run `bash tools/generate-readme.sh`.

## Guarded files

- `readme_manifest/*.md`
