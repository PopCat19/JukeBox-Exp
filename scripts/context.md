# scripts context

- `run.sh`, Detect available JS runtime, set runner variables, and resolve tool binaries
- `build.ts`, Builds all bundles with esbuild via JS API in parallel
- `lint.sh`, Runs biome, TypeScript type-checking, and eslint
- `lint-fix.sh`, Runs biome check --write for formatting and safe lint fixes
- `deploy.sh`, Builds and deploys the website to GitHub Pages
- `deploy_files.sh`, Assembles deployment directory with compiled assets and static files
- `debugify.sh`, Renames compiled editor output to minified filename and plays alert beeps
- `live-editor.sh`, Starts live development server with esbuild watch and auto-reload
- `check-input-staleness.ts`, Detects input binding inventory drift against source files
- `generate-help-markdown.ts`, Generates help guide markdown from the input binding inventory
- `verify-delete-module.sh`, Removes a module folder, runs build + tests, restores it to detect import coupling
