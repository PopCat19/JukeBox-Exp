# NixOS → TypeScript Codebase Structure Mapping

## Executive Summary

Your NixOS config and this TypeScript codebase follow **similar layering principles**, but solve different problems. Understanding the mapping will help you navigate refactors.

## Side-by-Side Comparison

```
NIXOS CONFIG                          TYPESCRIPT CODEBASE
─────────────────                     ─────────────────────
configuration/                        editor/
│                                       │
├── base/                              ├── core/
│   ├── system/                        │   ├── change.ts
│   │   ├── boot.nix                   │   ├── keyboard-handler.ts
│   │   └── networking.nix           │   └── menu-handler.ts
│   └── configuration.nix              │
│                                      ├── ui/          ← BASE LAYER
├── home/                              │   ├── base/
│   ├── modules/                       │   │   ├── button.ts
│   │   ├── git.nix                    │   │   ├── input.ts
│   │   └── kitty.nix                  │   │   └── container.ts
│   └── home.nix                       │   ├── buttons/
│                                      │   ├── containers/
│                                      │   └── inputs/
├── hosts/                             ├── components/  ← FEATURES
│   ├── popcat19-nixos0/               │   ├── pattern-editor.ts
│   │   ├── configuration.nix          │   ├── track-editor.ts
│   │   └── modules/                   │   └── envelope-editor.ts
│   │       └── hardware.nix           │
│   └── ...                            ├── prompts/     ← DIALOGS
│                                      │   ├── export-prompt.ts
├── system/                            │   └── import-prompt.ts
│   ├── modules/                       │
│   │   ├── audio.nix                  ├── config/
│   │   └── display.nix                │   └── editor-config.ts
│   └── packages.nix                   │
│                                      ├── changes/    ← STATE MGMT
├── profiles/                          │   ├── notes.ts
│   ├── laptop.nix                     │   └── instruments.ts
│   └── minimal.nix                    │
│                                      └── song-editor.ts  ← MAIN
└── context.md
                                      synth/          ← AUDIO ENGINE
                                      ├── plugins/
                                      ├── synthesis/
                                      └── synth.ts

                                      shared/         ← SHARED UTILS
                                      ├── themes/
                                      └── color-config.ts
```

## Conceptual Mapping

| NixOS Concept | TypeScript Equivalent | Purpose |
|--------------|----------------------|---------|
| **base/system/** | **ui/base/** | Primitive building blocks |
| **home/modules/** | **ui/buttons/, ui/containers/** | Composable widgets |
| **system/modules/** | **editor/components/** | Feature implementations |
| **hosts/** | **editor/prompts/** | Context-specific overrides |
| **profiles/** | **editor/config/preset_category/** | Preset configurations |
| **home/home.nix** | **editor/song-editor.ts** | Main composition point |
| **lib/** | **shared/** | Shared utilities |
| **flake.nix** | **index.ts / main.ts** | Entry point |

## Key Differences

### 1. Configuration vs. Code

**NixOS** (Declarative):
```nix
# You describe what you want
services.audio.enable = true;
programs.kitty.enable = true;
```

**TypeScript** (Imperative):
```typescript
// You build it step by step
const editor = new SongEditor();
editor.appendChild(patternEditor);
editor.appendChild(trackEditor);
```

### 2. Override Pattern

**NixOS hosts/** - Per-machine overrides:
- `hosts/popcat19-surface0/modules/thermal-config.nix` overrides base thermal settings

**TypeScript prompts/** - Context-specific UI:
- Each prompt is a complete dialog for a specific action
- No override mechanism - each is self-contained

### 3. Module Structure

**NixOS** - Uses `imports` and `config`:
```nix
{ config, pkgs, ... }: {
  imports = [ ./base ];
  config.services.xxx.enable = true;
}
```

**TypeScript** - Uses ES6 imports:
```typescript
import { actionButton } from "./ui/buttons";
import { PatternEditor } from "./components/pattern-editor";

// Compose together
const button = actionButton("Save");
const editor = new PatternEditor();
```

## What Translates Well

### ✅ Good: Layer Separation

Your NixOS structure has clear layers:
1. **Primitives** (base/system/) → **ui/base/**
2. **Widgets** (home/modules/) → **ui/buttons/, ui/containers/**
3. **Features** (system/modules/) → **editor/components/**
4. **Composition** (home.nix) → **song-editor.ts**

This is **exactly** how the codebase should work.

### ⚠️ Mismatch: Host Overrides

NixOS has per-host customization via `hosts/`.

TypeScript doesn't have an equivalent because:
- It's the same app running everywhere
- Theming is handled via `shared/themes/` (58 theme files)
- Layout variations in `editor/ui/layout/`

### ❌ Different: State Management

NixOS is stateless (pure config).

TypeScript has stateful components:
- `editor/changes/` = undo/redo system
- `editor/core/` = state management
- Components hold internal state

## Refactor Strategy Using NixOS Mental Model

### Step 1: Primitives (Like base/system/)

**Current:** Inline in `song-editor.ts`:
```typescript
const button = HTML.button({class: "action"}, "Save");
```

**Goal:** Extract to `ui/base/` (like your NixOS base/):
```typescript
// ui/base/button.ts
export function createButton(style, options, label) {
  return HTML.button({style, ...options}, label);
}
```

**NixOS equivalent:** Moving inline `services.xxx` calls to dedicated modules.

### Step 2: Widgets (Like home/modules/)

**Current:** Not consistent.

**Goal:** Use `ui/buttons/`, `ui/containers/` (like your home/modules/):
```typescript
import { actionButton } from "../ui/buttons";
const button = actionButton("Save");
```

**NixOS equivalent:** Using your pre-made modules instead of inline config.

### Step 3: Features (Like system/modules/)

**Current:** Mixed in `song-editor.ts`.

**Goal:** Each major UI area → `editor/components/` (like system/modules/):
- Pattern editor → `components/pattern-editor.ts`
- Track editor → `components/track-editor.ts`
- Settings panel → `components/settings-panel.ts`

**NixOS equivalent:** Splitting configuration.nix into audio.nix, display.nix, etc.

### Step 4: Composition (Like home.nix)

**Current:** `song-editor.ts` (4717 lines) does everything.

**Goal:** Thin composition layer (like home.nix importing modules):
```typescript
import { PatternEditor } from "./components/pattern-editor";
import { TrackEditor } from "./components/track-editor";

export class SongEditor {
  constructor() {
    this.appendChild(new PatternEditor());
    this.appendChild(new TrackEditor());
  }
}
```

## Visual Hierarchy

```
┌─────────────────────────────────────┐
│         Application (Entry)         │  ← flake.nix / main.ts
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │
│   │     SongEditor (Main)       │   │  ← home.nix / song-editor.ts
│   │                             │   │
│   │  ┌─────────────────────┐    │   │
│   │  │   PatternEditor     │    │   │  ← kitty.nix / pattern-editor.ts
│   │  │  ┌───────────────┐  │    │   │
│   │  │  │ actionButton  │  │    │   │  ← git.nix / action-button.ts
│   │  │  │  ┌──────────┐ │  │    │   │
│   │  │  │  │  Button  │ │  │    │   │  ← base/ / button.ts
│   │  │  │  └──────────┘ │  │    │   │
│   │  │  └───────────────┘  │    │   │
│   │  └─────────────────────┘    │   │
│   │                             │   │
│   │  ┌─────────────────────┐    │   │
│   │  │   TrackEditor       │    │   │  ← niri.nix / track-editor.ts
│   │  └─────────────────────┘    │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Action Items

1. **Extract primitives first** (base layer)
   - Find all `HTML.button`, `HTML.div` in `song-editor.ts`
   - Move to `ui/base/button.ts`, `ui/base/container.ts`

2. **Create widgets** (widget layer)
   - Wrap base elements in `ui/buttons/`, `ui/containers/`
   - Use existing ones as reference

3. **Split features** (feature layer)
   - Extract pattern editor logic to `components/`
   - Extract track editor logic to `components/`

4. **Thin composition** (main file)
   - `song-editor.ts` should just import and compose
   - Like home.nix importing modules

## Quick Reference

| When you see... | Think... |
|-----------------|----------|
| `song-editor.ts` | Your `home.nix` - the composition point |
| `ui/base/` | Your `base/system/` - primitives |
| `ui/buttons/` | Your `home/modules/` - reusable widgets |
| `editor/components/` | Your `system/modules/` - feature implementations |
| `editor/prompts/` | Your `hosts/` - specific contexts |
| `shared/` | Your `lib/` - shared utilities |
| `index.ts` | Your `flake.nix` - entry point |
