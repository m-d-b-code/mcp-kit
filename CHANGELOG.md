# Changelog

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
