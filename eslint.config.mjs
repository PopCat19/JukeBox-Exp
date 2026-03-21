import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: [
            "build/**",
            "website/**",
            "archive/**",
            "node_modules/**",
            "conventions/**",
            ".kilocode/**",
        ],
    },
    {
        rules: {
            // Relax rules for legacy codebase
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-this-alias": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "no-constant-condition": "off",
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-prototype-builtins": "off",
        },
    },
);
