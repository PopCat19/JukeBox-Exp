# UI Component Refactor Plan

## Goal
Implement Figma-style component hierarchy with parent/base components that child variants extend from.

## Proposed Directory Structure

```
editor/ui/
├── base/
│   ├── input.ts          # Base HTMLInputElement factory
│   ├── container.ts      # Base container factory (div, span)
│   ├── button.ts         # Base button factory
│   ├── label.ts          # Base label factory
│   └── index.ts          # Barrel export
│
├── inputs/               # Input variants extending base/input
│   ├── search-input.ts
│   ├── stepper-input.ts
│   ├── checkbox-input.ts
│   ├── input-box.ts      # From html-wrapper.ts
│   └── index.ts
│
├── containers/           # Container variants extending base/container
│   ├── scrollable-container.ts
│   ├── flex-row-center.ts
│   ├── flex-column-center.ts
│   ├── form-row.ts
│   ├── label-row.ts
│   ├── okay-row.ts
│   ├── select-row.ts
│   ├── select-container.ts
│   ├── checkbox-row.ts
│   └── index.ts
│
├── labels/               # Label variants extending base/label
│   ├── field-label.ts
│   ├── section-label.ts
│   └── index.ts
│
├── buttons/              # Button variants extending base/button
│   ├── clear-button.ts
│   └── index.ts
│
├── chips/                # Tag/chip components
│   ├── tag-chip.ts
│   ├── tag-suggestion-item.ts
│   ├── tag-list-item.ts
│   └── index.ts
│
├── sliders/              # Slider variants
│   ├── slider.ts         # From html-wrapper.ts
│   └── index.ts
│
├── layout/               # Layout configuration
│   ├── layout.ts         # From current layout.ts
│   └── index.ts
│
├── array-buffer-reader.ts  # Keep as-is
├── array-buffer-writer.ts  # Keep as-is
└── index.ts                # Root barrel export
```

## Component Hierarchy Example

### Base Input (parent)
```typescript
// base/input.ts
export function createInput(
  type: string,
  baseStyle: string,
  options?: InputOptions
): HTMLInputElement {
  return HTML.input({
    type,
    style: baseStyle,
    ...options
  });
}
```

### Child Variant (extends parent)
```typescript
// inputs/search-input.ts
import { createInput } from '../base/input';

export function searchInput(placeholder: string, extraStyle?: string): HTMLInputElement {
  const baseStyle = "flex: 1; min-width: 0; padding: 6px 10px; ...";
  const style = extraStyle ? `${baseStyle} ${extraStyle}` : baseStyle;
  
  return createInput('text', style, { placeholder });
}
```

## Migration Steps

1. Create `base/` directory with base factories
2. Create category directories (`inputs/`, `containers/`, etc.)
3. Migrate each component function to its own file
4. Move InputBox/Slider from `html-wrapper.ts` to `inputs/` and `sliders/`
5. Move Layout to `layout/`
6. Update `index.ts` barrel exports
7. Update all imports across codebase (17 prompt files)
8. Delete old `components.ts`, `html-wrapper.ts`

## Import Change Example

Before:
```typescript
import { searchInput, tagChip } from "../ui/components";
```

After:
```typescript
import { searchInput } from "../ui/inputs";
import { tagChip } from "../ui/chips";
// OR use barrel:
import { searchInput, tagChip } from "../ui";
```

## Benefits

- Clear visual hierarchy (base → variants)
- Easy to find/modify individual components
- Colocated styling and behavior
- Extensible for new variants
- Better tree-shaking

## Estimated Files Changed

- New files: ~25
- Modified imports: ~17 prompt files
- Build config: Possibly tsconfig path aliases