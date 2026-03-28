# scripts context

- `build.ts` — Builds all bundles with esbuild via JS API in parallel
- `lint.sh` — Runs dprint, TypeScript type-checking, and eslint
- `deploy.sh` — Builds and deploys the website to GitHub Pages
- `deploy_files.sh` — Assembles deployment directory with compiled assets and static files
- `debugify.sh` — Renames compiled editor output to minified filename and plays alert beeps
- `live-editor.sh` — Starts live development server with esbuild watch and auto-reload
