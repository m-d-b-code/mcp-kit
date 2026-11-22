// Vitest setup file: no test leaves the machine. `fetch` refuses any host but the loopback, where
// the project's fake upstream runs. A test that forgot to inject the fake origin fails here
// instead of hitting the real service, with the developer's credentials.
//
// Wired by `mcpVitestConfig`, or by hand: `setupFiles: ["@m-d-b-code/mcp-kit/offline"]`.

import { inject } from "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    /** Variables removed from the environment before each test file, see `mcpVitestConfig`. */
    "mcp-kit:unset-env": string[];
  }
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  const host = URL.canParse(url) ? new URL(url).hostname : url;
  if (!LOOPBACK.has(host)) {
    throw new Error(`offline test: request to ${url} refused (@m-d-b-code/mcp-kit/offline)`);
  }
  return realFetch(input, init);
};

// Absent when this file is wired by hand, without `mcpVitestConfig`.
const unset = (inject("mcp-kit:unset-env") as string[] | undefined) ?? [];
for (const name of unset) Reflect.deleteProperty(process.env, name);
