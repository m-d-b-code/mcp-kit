# Changelog

## 0.4.0

Breaking for lint: a project that did not pass `limits` gets new findings to fix.

- `limits` is on by default in `/eslint` (complexity 20, depth 4, 80 lines per function, 300 per
  file). `limits: false` turns the caps off.
- `/knip`: `mcpKnipConfig` for `knip.config.ts` (sources in `src/` and `tests/`, types
  exported next to their function ignored, `entry` / `ignore` / `ignoreDependencies`). `knip`
  becomes an (optional) peer dependency. The kit runs it on itself in `npm run check`.

## 0.3.3

- Built without source maps: the published files no longer point to maps the package does not
  ship (Vite warned on loading `/offline`).

## 0.3.2

- `vitest/valid-expect` accepts `expect(value, message)`, which vitest supports.

## 0.3.1

- `prefer-nullish-coalescing` leaves optional booleans alone: `flag || other` is logic, not a
  default value.

## 0.3.0

Breaking for lint: projects get new findings to fix.

- `/eslint` is stricter: `stylisticTypeChecked`, `eslint-plugin-regexp`, `@vitest/eslint-plugin` on
  tests, `switch-exhaustiveness-check`, `consistent-type-imports`, `prefer-nullish-coalescing`
  (strings excepted), `restrict-template-expressions` with numbers only, `curly`,
  `no-param-reassign`, `no-else-return`, `object-shorthand`, `prefer-template`,
  `array-callback-return`, `radix`, and no `process.stdout` in `src/`. `eslint-plugin-regexp`
  and `@vitest/eslint-plugin` become (optional) peer dependencies.
- `limits` option: opt-in caps on complexity, depth, function and file length.
- `/vitest`: `mcpVitestConfig` (tests in `tests/`, offline guard, v8 coverage of `src/`,
  `thresholds`, `coverageExclude`, `unsetEnv`).
- `/offline`: the setup file that refuses any `fetch` outside the loopback.

## 0.2.1

- `listen` waits for an asynchronous `onShutdown` before exiting, instead of exiting while it
  runs (exit code 1 if it rejects).

## 0.2.0

- `createBridgeServer` takes `routes`: extra paths behind the same token as `/mcp`, answered
  as JSON with what their handler returns (a throw gives a 500 and a log line).
- CI reports the `ci` commit status on Renovate branches.

## 0.1.1

First release published from CI through npm trusted publishing, with provenance. No code
change.

## 0.1.0

First release: `createBridgeServer` (2025-era clients served unless `legacy: "reject"`), `listen`, `runMain`, `isEntryPoint`, configuration readers,
`loggerFactory`, `jobReporter`, errors, the dependency-free `/protocol` entry, the `/eslint`
config, the base tsconfig and the reusable CI workflow.
