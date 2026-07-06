// ESLint Config
//
// Purpose: strictTypeChecked ESLint config with phased-warn strategy
// See: https://pocketarc.com/typescript

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintSecurity from "eslint-plugin-security";

export default tseslint.config(
  eslint.configs.recommended,
  eslintSecurity.configs.recommended,
  {
    rules: {
      // Known false-positive for client-side apps — config[key] is data access, not injection
      "security/detect-object-injection": "off",
    },
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "shared/styles/css-var-contract.ts",
            "tests/css-var-contract.test.ts",
            "tests/interactions-behavior.test.ts",
            "tests/style-inject.test.ts",
            "tests/ui-states.test.ts",
            "tests/socket-contract.test.ts",
            "tests/modules-supersaw.test.ts",
            "editor/generated-ui/change-factory.ts",
            "editor/generated-ui/panel-factory.ts",
            "tests/generated-ui.test.ts",
            "tests/serde-container.test.ts",
            "synth/socket/id-table.ts",
            "synth/formats/jukebox-exp-v2.ts",
            "eslint.config.mjs",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      "build/**",
      "website/**",
      "archive/**",
      "node_modules/**",
      "conventions/**",
      ".kilocode/**",
      // Not tracked by any tsconfig
      "editor/config/index.ts",
      "editor/core/index.ts",
      "editor/input/**",
      "editor/io/index.ts",
      "editor/prompts/index.ts",
      "editor/renderers/index.ts",
      "editor/rendering/index.ts",
      "player/index.ts",
    ],
  },
  {
    rules: {
      // ── Error-level (block CI) ──

      "no-var": "error",
      "no-empty": ["warn", { allowEmptyCatch: true }],

      // Low-volume, high-value type-safety rules — keep as errors
      "@typescript-eslint/no-duplicate-type-constituents": "error",
      "@typescript-eslint/no-redundant-type-constituents": "error",
      "@typescript-eslint/no-misused-promises": ["error", {
        "checksVoidReturn": false
      }],
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "@typescript-eslint/no-unnecessary-type-parameters": "error",
      "@typescript-eslint/no-base-to-string": "warn",

      // ── Fix-immediately warn (target: migrate to error) ──

      "eqeqeq": "warn",
      "@typescript-eslint/no-deprecated": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "no-irregular-whitespace": "warn",
      "@typescript-eslint/no-implied-eval": "warn",
      "@typescript-eslint/no-extraneous-class": "warn",

      // ── Structural warns (DOM codebase — inherently unsafe-typed) ──

      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-enum-comparison": "warn",
      "@typescript-eslint/restrict-plus-operands": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",

      // ── High-volume but fixable over time ──

      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-confusing-void-expression": "warn",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
      "@typescript-eslint/no-unnecessary-type-conversion": "warn",
      "@typescript-eslint/no-unnecessary-template-expression": "warn",
      "@typescript-eslint/unbound-method": "warn",
      "@typescript-eslint/prefer-literal-enum-member": "warn",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "warn",

      // ── Legacy relaxations ──

      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-constant-condition": "off",
      "no-prototype-builtins": "off",
      "no-useless-assignment": "warn",
      "prefer-const": "warn",
    },
  },
  {
    // Serialization layer exemption — operates on untyped JSON (Record<string, unknown>)
    files: ["synth/song-serialization.ts", "synth/formats/legacy-compat.ts", "synth/formats/jukebox-exp.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-deprecated": "off",
    },
  },
);
