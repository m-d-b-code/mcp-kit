// The lint every project shares. Spread it first, then add the project's own blocks:
//   export default [...mcpProjectConfig({ root: import.meta.dirname }), { … }];

import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import regexp from "eslint-plugin-regexp";
import type { Linter } from "eslint";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export interface SizeLimits {
  /** Cyclomatic complexity of one function. */
  complexity?: number;
  /** Nesting depth of blocks. */
  depth?: number;
  /** Lines of code in one function, blanks and comments excluded. */
  functionLines?: number;
  /** Lines of code in one file, blanks and comments excluded. */
  fileLines?: number;
}

export interface LintOptions {
  /** The project's root, `import.meta.dirname` of its `eslint.config.js`. */
  root: string;
  /** The tsconfig that covers sources and tests alike. */
  project?: string;
  /**
   * Caps on the size of the sources (`src/`), off by default. `true` takes the defaults
   * (complexity 20, depth 4, 80 lines per function, 300 per file).
   */
  limits?: boolean | SizeLimits;
}

const DEFAULT_LIMITS: Required<SizeLimits> = {
  complexity: 20,
  depth: 4,
  functionLines: 80,
  fileLines: 300,
};

function sizeRules(limits: LintOptions["limits"]): Linter.RulesRecord {
  if (!limits) return {};
  const { complexity, depth, functionLines, fileLines } = {
    ...DEFAULT_LIMITS,
    ...(limits === true ? {} : limits),
  };
  const lines = { skipBlankLines: true, skipComments: true };
  return {
    complexity: ["error", complexity],
    "max-depth": ["error", depth],
    "max-lines-per-function": ["error", { max: functionLines, ...lines }],
    "max-lines": ["error", { max: fileLines, ...lines }],
  };
}

export function mcpProjectConfig({
  root,
  project = "./tsconfig.test.json",
  limits = false,
}: LintOptions): ReturnType<typeof defineConfig> {
  return defineConfig(
    { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    regexp.configs["flat/recommended"],
    {
      languageOptions: { parserOptions: { project, tsconfigRootDir: root } },
      rules: {
        // The price of `noUncheckedIndexedAccess`: `rows[0]!` after a length check.
        "@typescript-eslint/no-non-null-assertion": "off",
        // `raw["url"]` on a `Record<string, unknown>` says the key is not guaranteed.
        "@typescript-eslint/dot-notation": "off",
        // Only numbers interpolate cleanly: a `null` must not end up as "null" in a tool's text.
        "@typescript-eslint/restrict-template-expressions": [
          "error",
          {
            allowNumber: true,
            allowAny: false,
            allowBoolean: false,
            allowNullish: false,
            allowRegExp: false,
            allowNever: false,
          },
        ],
        // `||` on a string is meant: an empty string calls for the fallback as much as absence.
        // On an optional flag, `flag || other` is plain logic, not a default value.
        "@typescript-eslint/prefer-nullish-coalescing": [
          "error",
          { ignorePrimitives: { string: true, boolean: true } },
        ],
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "@typescript-eslint/consistent-type-imports": ["error", { disallowTypeAnnotations: false }],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        // `() => resolve()` returns nothing useful, nobody is misled.
        "@typescript-eslint/no-confusing-void-expression": [
          "error",
          { ignoreArrowShorthand: true },
        ],
        // Logs go through the kit's logger, on stderr.
        "no-console": "error",
        eqeqeq: ["error", "smart"],
        curly: ["error", "multi-line"],
        "no-param-reassign": "error",
        "no-else-return": ["error", { allowElseIf: false }],
        "object-shorthand": "error",
        "prefer-template": "error",
        "array-callback-return": "error",
        radix: "error",
      },
    },
    {
      files: ["src/**/*.ts"],
      rules: {
        // On stdio, stdout carries the MCP protocol: one stray write corrupts the stream.
        "no-restricted-properties": [
          "error",
          {
            object: "process",
            property: "stdout",
            message: "stdout carries the MCP protocol on stdio: log through the kit's logger.",
          },
        ],
        ...sizeRules(limits),
      },
    },
    {
      files: ["tests/**/*.ts"],
      extends: [vitest.configs.recommended],
      rules: {
        // A fake server implements an asynchronous interface without awaiting anything.
        "@typescript-eslint/require-await": "off",
        // `expect.stringContaining()` is typed `any` by vitest.
        "@typescript-eslint/no-unsafe-assignment": "off",
        // A silent logger or a no-op callback is a legitimate fake.
        "@typescript-eslint/no-empty-function": "off",
      },
    },
    // A script run by hand prints its findings.
    { files: ["scripts/**/*.ts"], rules: { "no-console": "off" } },
    { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
  );
}
