# mcp-kit

Public npm package `@m-d-b-code/mcp-kit`: the shared foundation of MCP servers reached through a
gateway (authenticated HTTP transport, config, logging, job-run reporting), plus their ESLint config, base tsconfig and reusable CI workflow. `CLAUDE.md` only
imports this file.

## Rules

- **Public repository**: nothing specific to one deployment (host names, internal URLs, secrets).
  Everything comes from the project's environment.
- **Every release reaches every dependent**, possibly unattended. A breaking change is a major
  release (a minor while at `0.x`), never a patch. Record it in `CHANGELOG.md`.
- `src/protocol.ts` depends on nothing: gateways import it without the server SDK.
- The MCP SDK stays a peer dependency; add a runtime dependency only as a last resort.

## Work and validation

- `npm run check` (Prettier, types, ESLint, tests, build) runs in `pre-push` and in CI.
- Commit subjects follow Conventional Commits (`commit-msg` hook).
- Release: `npm version <level>`, then `git push --follow-tags` (`publish.yml`).

## Style

English everywhere: code, comments, docs, error and log messages. Comments explain a non-obvious
_why_, not the _what_.
