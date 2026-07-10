# Restructure website markup and static stylesheet ownership

Purpose: Replace presentation-heavy website markup with semantic structure and scoped static CSS.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `refactor`, `html`, `css`, `website`  
**Depends on:** #01

## Problem

`website/index.html`, offline HTML, and manual pages mix document structure, inline presentation, and repeated navigation markup.

## Scope

- Define semantic page landmarks for landing, offline, and manual pages.
- Move static inline styles and presentational elements into owned stylesheet classes.
- Define shared manual navigation and page-shell markup without changing public URLs.
- Keep no-JavaScript and offline behavior intact.

Migrated manual pages: `introduction.html`, `instructions.html`, `features.html`, `patch_notes.html`, `credits.html`, `faq.html`, `keybinds.html`, `leaderboard.html`, `resources.html`, `top_sneaky.html`. Navigation markup currently differs across pages, so a shared partial needs to reconcile the existing per-page link sets. If shared markup needs generation, extend `scripts/generate-help-markdown.ts` rather than adding a new generator.

## Acceptance criteria

- Landing and manual pages use semantic `header`, `main`, `nav`, and `footer` landmarks where appropriate.
- Static inline `style` and inline event handlers are removed from migrated pages.
- Manual page navigation has one source of truth at build time or in a checked-in partial.
- Existing manual URLs and direct deep links still load as standalone static pages.
- Offline HTML works with network access disabled.

## Verification

- Check the landing page, offline page, and every manual URL directly.
- Run an HTML validator and keyboard navigation pass.

## Risk

Client-side template loading would break direct static navigation without JavaScript. Prefer build-time assembly when shared markup needs generation.
