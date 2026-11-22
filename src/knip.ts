// The dead-code check every project shares, as its `knip.config.ts`:
//   export default mcpKnipConfig();

import type { KnipConfiguration } from "knip";

export interface KnipOptions {
  /** Entry files besides what knip finds on its own (`package.json` scripts, configs, tests). */
  entry?: string[];
  /** Files left out of the analysis altogether. */
  ignore?: string[];
  /** Dependencies knip cannot see used: a binary called from a Dockerfile, say. */
  ignoreDependencies?: (string | RegExp)[];
}

export function mcpKnipConfig({
  entry = [],
  ignore = [],
  ignoreDependencies = [],
}: KnipOptions = {}): KnipConfiguration {
  return {
    // Knip's own entries stay: `package.json` scripts (the server's `serve`), configs, tests.
    ...(entry.length > 0 ? { entry } : {}),
    project: ["src/**/*.ts", "tests/**/*.ts"],
    ignore,
    ignoreDependencies,
    // A type exported next to the function that takes it documents the signature.
    ignoreExportsUsedInFile: { interface: true, type: true },
  };
}
