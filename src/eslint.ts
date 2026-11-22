// The lint every project shares. Spread it first, then add the project's own blocks:
//   export default [...mcpProjectConfig({ root: import.meta.dirname }), { … }];

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export interface LintOptions {
  /** The project's root, `import.meta.dirname` of its `eslint.config.js`. */
  root: string;
  /** The tsconfig that covers sources and tests alike. */
  project?: string;
}

export function mcpProjectConfig({
  root,
  project = "./tsconfig.test.json",
}: LintOptions): ReturnType<typeof defineConfig> {
  return defineConfig(
    { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
      languageOptions: { parserOptions: { project, tsconfigRootDir: root } },
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        // Logs go through the kit's logger, on stderr.
        "no-console": "error",
        // `() => resolve()` returns nothing useful, nobody is misled.
        "@typescript-eslint/no-confusing-void-expression": [
          "error",
          { ignoreArrowShorthand: true },
        ],
        eqeqeq: ["error", "smart"],
      },
    },
    {
      files: ["tests/**/*.ts"],
      rules: {
        "@typescript-eslint/require-await": "off",
        // `expect.stringContaining()` is typed `any` by vitest.
        "@typescript-eslint/no-unsafe-assignment": "off",
      },
    },
    // A script run by hand prints its findings.
    { files: ["scripts/**/*.ts"], rules: { "no-console": "off" } },
    { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
  );
}
