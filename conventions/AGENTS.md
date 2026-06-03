# AGENTS

**Purpose:** Reference document for LLM assistants working with this repository.

## Documentation Files

### DEVELOPMENT.md

Opinionated agent development rules and conventions. Covers:

- File headers and code style across multiple languages (Nix, Fish, Python, Bash, Rust, Go, TypeScript)
- Naming conventions and project structure
- Comments, navigation, and file hygiene
- DRY refactoring patterns
- Commit message format and workflow
- Documentation guidelines
- Validation and CI/CD configuration
- Principles (KISS, DRY, SoC, SRP, CoC, maintainable over clever)
- Vocabulary (DDD + Figma bridge, repo-agnostic definitions)

**Reading guide:** Comprehensive document (1.5~3k lines). Use the table of contents to navigate to relevant sections.

### DEV-EXAMPLES.md

Concrete examples demonstrating conventions from DEVELOPMENT.md. Includes:

- File header patterns
- Code style transformations (flatten nesting, extract repeated values)
- Naming and structure examples
- Comment guidelines (what to keep vs. remove)
- DRY refactoring before/after examples
- Commit message format examples
- CI/CD workflow patterns

**Purpose:** Optional reference material for understanding rules in practice.

### context.md

Each directory with 5+ non-obvious files has a `context.md` listing every file with a one-line purpose. These derive from file header `Purpose:` lines and must stay in sync.

**Reading guide:** Check `context.md` to understand a directory's contents without opening each file.

## Scripts

### dev-conventions.sh

Unified CLI for all convention tooling. Entry point for changelog, sync, and lint commands.

**Usage:**
```bash
./conventions/dev-conventions.sh              # Interactive TUI (requires gum)
./conventions/dev-conventions.sh changelog    # Generate changelog and merge
./conventions/dev-conventions.sh sync         # Sync conventions from remote
./conventions/dev-conventions.sh lint         # Lint shell scripts
./conventions/dev-conventions.sh help
```

### src/changelog.sh

Generates changelog from git history before merge. Called via `dev-conventions.sh changelog`.

### src/sync.sh

Syncs convention files from remote repository to target projects. Called via `dev-conventions.sh sync`.

### src/lint.sh

Shell script linting and formatting (shfmt, shellcheck). NixOS-aware: resolves tools via PATH first, then falls back to `nix run nixpkgs#PACKAGE`. Called via `dev-conventions.sh lint`.

### src/check-context.sh

Verifies `context.md` files match actual directory contents. Detects structural and content drift.

## Project Scripts (`scripts/`)

### scripts/lint.sh

Runs biome, TypeScript type-checking, and eslint. NixOS-aware: resolves biome/tsc/eslint via PATH → `./node_modules/.bin/` → `nix run nixpkgs#PACKAGE`.

### scripts/live-editor.sh / scripts/live-editor-static.sh

Esbuild watch + dev server. On NixOS, uses `nix run nixpkgs#esbuild` instead of `bunx`/`npx` (the npm esbuild binary is dynamically linked and won't run on NixOS).

### scripts/run.sh

Detects JS runtime: exports `RUNNER=bun` (or `node`) and `RUNX=bunx` (or `npx`).

### scripts/build.ts

Production build via esbuild JS API. Called via `bun scripts/build.ts` (or `bun run build`).

## Environment

### NixOS support

This project works on NixOS via `flake.nix`:

```bash
nix develop          # Enter dev shell (bun, nodejs, biome, shfmt, shellcheck)
bun install
bun run dev          # Start dev server
```

The dev flake provides: `bun`, `nodejs`, `biome`, `shfmt`, `shellcheck`.
Scripts detect NixOS (`/etc/NIXOS`) and fall back to `nix run nixpkgs#PACKAGE`
for tools whose npm binaries are dynamically linked (esbuild, biome).

## Important Notice

**Do not revise these files unless explicitly requested by the user:**

- `DEVELOPMENT.md` — Established conventions for this project
- `DEV-EXAMPLES.md` — Reference examples tied to DEVELOPMENT.md rules
- `src/changelog.sh` — Workflow script following project conventions
- `src/sync.sh` — Workflow script following project conventions

**Note on SKILL.md:** The `conventions/SKILL.md` file is a dangling reference
to `../skills/dev-mini/SKILL.md` (from the upstream dev-conventions project).
It is not applicable to this repo unless the skills directory is populated.

**Repo-specific vocabulary mapping** lives in the root `context.md`, not in
convention files. Do not add project paths to DEVELOPMENT.md.

These files represent intentional design decisions. Modifications should only occur when the user explicitly states a need for changes.
