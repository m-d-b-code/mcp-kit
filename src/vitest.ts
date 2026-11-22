// The test setup every project shares. Merge the project's own settings on top:
//   export default mergeConfig(mcpVitestConfig({ … }), defineConfig({ test: { … } }));

import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type ViteUserConfig } from "vitest/config";

export interface CoverageThresholds {
  statements?: number;
  branches?: number;
  functions?: number;
  lines?: number;
}

export interface TestOptions {
  /**
   * Coverage floor, checked by `vitest run --coverage` (needs `@vitest/coverage-v8`). A floor,
   * raised by hand as the figure climbs: it keeps the suite from sliding back.
   */
  thresholds?: CoverageThresholds;
  /** Sources left out of coverage: what only runs by hand against the real service. */
  coverageExclude?: string[];
  /**
   * Environment variables removed before every test file: the developer's credentials must
   * never reach a test, each test sets its own.
   */
  unsetEnv?: string[];
}

// `.ts` while the kit tests itself from its sources, `.js` once built.
const OFFLINE = fileURLToPath(
  new URL(`./offline${extname(fileURLToPath(import.meta.url))}`, import.meta.url),
);

export function mcpVitestConfig({
  thresholds,
  coverageExclude = [],
  unsetEnv = [],
}: TestOptions = {}): ViteUserConfig {
  return defineConfig({
    test: {
      include: ["tests/**/*.test.ts"],
      environment: "node",
      setupFiles: [OFFLINE],
      provide: { "mcp-kit:unset-env": unsetEnv },
      coverage: {
        provider: "v8",
        include: ["src/**/*.ts"],
        exclude: coverageExclude,
        reporter: ["text-summary", "html"],
        ...(thresholds ? { thresholds } : {}),
      },
    },
  });
}
