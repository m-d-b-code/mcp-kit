# mcp-kit

[![CI](https://github.com/m-d-b-code/mcp-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/m-d-b-code/mcp-kit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@m-d-b-code/mcp-kit)](https://www.npmjs.com/package/@m-d-b-code/mcp-kit)

The shared foundation of MCP servers that sit **behind a gateway**: servers nobody calls directly,
reached only by an aggregator that discovers their tools and exposes them to its own clients, over
an internal network. Everything each such server used to copy lives here:

- **HTTP transport**: `/mcp` behind a shared secret (`x-mcp-token` header, constant-time
  comparison), `/health` without one for the container healthcheck, a bounded request body (64 KiB
  by default), clean shutdown on `SIGTERM`. Stateless, JSON responses, one `McpServer` per request.
- **Protocol revisions**: whatever the installed SDK speaks (`2026-07-28` today), with 2025-era
  clients still served statelessly unless `legacy: "reject"` makes the server modern-only.
- **Configuration** read from the environment: a clear error at startup, never a degraded mode.
- **Logging** to stderr, its level set by a variable of the project's choosing.
- **Job-run reporting**: a server's internal timer reports each run to the gateway, which can then
  notice a timer that stopped.
- The **ESLint config**, **base tsconfig** and **CI workflow** these projects share.

It is deliberately opinionated: one transport shape, one auth scheme. If your server faces clients directly (OAuth, sessions, SSE streams), use the MCP SDK on its own.

## Install

```sh
npm install @m-d-b-code/mcp-kit @modelcontextprotocol/server @modelcontextprotocol/node
```

The MCP SDK is a peer dependency: one copy, at the version the project picks. Node.js 26 or later.

## Server

```ts
import { McpServer } from "@modelcontextprotocol/server";
import {
  createBridgeServer,
  isEntryPoint,
  listen,
  loggerFactory,
  readListenConfig,
  runMain,
} from "@m-d-b-code/mcp-kit";

const log = loggerFactory("DEMO_LOG_LEVEL")("http");

function buildServer(): McpServer {
  const server = new McpServer({ name: "demo", version: "1.0.0" });
  // server.registerTool(…)
  return server;
}

async function main(): Promise<void> {
  // DEMO_MCP_TOKEN (required, 32 characters or more), DEMO_MCP_PORT, DEMO_MCP_HOST
  const config = readListenConfig(process.env, "DEMO", 8788);
  const server = createBridgeServer({ token: config.token, buildServer, log });
  await listen(server, config);
  log.info(`listening on ${config.host}:${config.port}`);
}

if (isEntryPoint(import.meta.url)) await runMain(main, log);
```

A `ConfigError` thrown by `main` becomes one log line and exit code 2. `readToken`,
`readInteger` and `readOptional` read the project's own variables. `listen` takes an
`onShutdown` callback to close stores and timers. `createBridgeServer` takes `maxBodyBytes` for
tools that receive whole documents as arguments, `legacy: "reject"` to refuse 2025-era clients
when the gateway only speaks `PROTOCOL_VERSION`, and `routes` for extra JSON paths behind the
same token (an operator's status page, say):

```ts
createBridgeServer({ token, buildServer, routes: { "/status": () => store.status() } });
```

## Gateway side

`@m-d-b-code/mcp-kit/protocol` has no dependency at all, not even the SDK. A gateway imports the
same header name as its servers, so the two ends cannot drift:

```ts
import { TOKEN_HEADER } from "@m-d-b-code/mcp-kit/protocol";

const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { [TOKEN_HEADER]: secret } },
});
// "auto": the newest revision both sides speak, 2025 for a server that knows nothing newer.
// `{ pin: PROTOCOL_VERSION }` instead, against servers started with `legacy: "reject"`.
const client = new Client(info, { versionNegotiation: { mode: "auto" } });
```

## Job-run reporting

```ts
import { jobReporter } from "@m-d-b-code/mcp-kit";

const report = jobReporter(); // JOBS_REPORT_URL + JOBS_REPORT_TOKEN, or nothing is sent
report("sync", { ok: true, detail: "12 rows", startedAt });
```

Each run is sent as `POST <JOBS_REPORT_URL>/<job>` with the token in `x-mcp-token` and a
`JobRun` body (`{ ok, detail, startedAt }`). A failed report is only logged. The receiver
validates the body with `parseJobRun` from `/protocol`.

## Tooling

`tsconfig.json` (compiles `src/` to `dist/`, paths resolved from the project):

```json
{ "extends": "@m-d-b-code/mcp-kit/tsconfig.json" }
```

`eslint.config.js` (with `eslint`, `@eslint/js` and `typescript-eslint` as dev dependencies):

```js
import { mcpProjectConfig } from "@m-d-b-code/mcp-kit/eslint";

export default mcpProjectConfig({ root: import.meta.dirname });
```

`.github/workflows/ci.yml` (runs `npm ci` then `npm run check`):

```yaml
jobs:
  check:
    uses: m-d-b-code/mcp-kit/.github/workflows/mcp-project.yml@<sha> # vX.Y.Z
```

Optional inputs: `node-version`, and `commit-status` to also report the result as a commit
status (see the workflow file).

## Versioning

Semantic versioning. While at `0.x`, a minor release may break; pin accordingly. Releases are
published from CI with npm trusted publishing and provenance: `npm version <level>`, then
`git push --follow-tags`. See [CHANGELOG.md](CHANGELOG.md).

## Contributing

Issues and pull requests are welcome. `npm install` sets up the git hooks; `npm run check` runs
formatting, types, lint, tests and the build, as CI does. Commit subjects follow
[Conventional Commits](https://www.conventionalcommits.org/).

## License

[MIT](LICENSE)
