import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import eslintPluginVitest from "eslint-plugin-vitest";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: [
      "dist/",
      "dev-dist/",
      "node_modules/",
      "*.config.js",
      "test-results/",
      "playwright-report/",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.strict.rules,
      "no-console": "warn",
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "object-shorthand": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["src/**/*.test.ts", "e2e/**/*.ts"],
    plugins: { vitest: eslintPluginVitest },
    languageOptions: {
      globals: { ...globals.vitest },
    },
    rules: {
      ...eslintPluginVitest.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
  prettierConfig,
];
