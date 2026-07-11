# CSS DOM HTML Restruct Context

Purpose: Forgejo issue drafts and the baseline ownership audit for restructuring CSS, DOM, and HTML ownership.

- `audit-inventory.md`, Checked-in baseline inventory of style sources, DOM hooks, CSS custom property classification, duplicate selectors, and naming rules. Deliverable for issue #23.
- `01-audit-and-contract.md`, Defines the baseline inventory and target contracts.
- `02-style-injection-and-cascade.md`, Defines deterministic injected stylesheet slots and theme order.
- `03-shared-tokens-and-theme-contract.md`, Separates shared design tokens from theme variable contracts.
- `04-editor-layout-and-component-classes.md`, Moves editor presentation into component-owned classes.
- `05-prompt-dom-and-state-classes.md`, Defines prompt markup and lifecycle state contracts. Depends on #02.
- `06-player-embed-dom-and-css.md`, Isolates the embedded player DOM and CSS boundary.
  Depends on #02, #03.
- `07-website-semantic-html-and-static-css.md`, Restructures website markup and static stylesheet ownership.
  Depends on #01.
- `08-css-dom-regression-guards.md`, Adds baseline contract checks before migration and final coverage after.
  Depends on #02, #03.
- `09-rendered-dom-checklist.md`, Repeatable manual browser verification checklist for audit §8 paths. Issue #30 phase 2.
