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
