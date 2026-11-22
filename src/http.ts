// The MCP server over HTTP, reached only by a gateway on an internal network.

import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { argv } from "node:process";
import { pathToFileURL } from "node:url";

import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { ConfigError } from "./errors.js";
import { type Logger, loggerFactory } from "./log.js";
import { HEALTH_PATH, MCP_PATH, TOKEN_HEADER } from "./protocol.js";

/** Builds the `McpServer` answering one request: the transport is stateless. */
export type ServerFactory = Parameters<typeof createMcpHandler>[0];

export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/** Answers an extra path with a JSON body; a throw becomes a 500 and a log line. */
export type RouteHandler = (request: IncomingMessage) => unknown;

export interface BridgeServerOptions {
  token: string;
  buildServer: ServerFactory;
  /** Raise it only for a tool that takes a document as argument. */
  maxBodyBytes?: number;
  /**
   * 2025-era clients: `"stateless"` (the default) still serves them, one stateless exchange per
   * request; `"reject"` answers them with the unsupported-version error, so that only
   * `PROTOCOL_VERSION` is spoken.
   */
  legacy?: "stateless" | "reject";
  /**
   * Extra paths behind the same token as `/mcp`, answered with what their handler returns as
   * JSON: an operator's view of the server's own state, for instance. `/mcp` and `/health` cannot
   * be overridden.
   */
  routes?: Record<string, RouteHandler>;
  log?: Logger;
}

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

// Constant time on fixed-length digests: `===` leaks the length of the matching prefix.
export function sameSecret(presented: string, expected: string): boolean {
  return presented.length > 0 && timingSafeEqual(digest(presented), digest(expected));
}

function send(response: ServerResponse, code: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

class BodyError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Read here rather than by `toNodeHandler`, so that the bound is the project's and the refusal ours.
async function readBody(request: IncomingMessage, maxBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > maxBytes) throw new BodyError("Request body too large.", 413);
    chunks.push(chunk);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BodyError("Unreadable request body (JSON expected).", 400);
  }
}

/**
 * `/health` without a token, `/mcp` and the project's `routes` behind `x-mcp-token`, nothing else. `/health` says nothing
 * about the project's upstreams: their outage must not get a healthy server restarted.
 */
export function createBridgeServer({
  token,
  buildServer,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  legacy = "stateless",
  routes = {},
  log = loggerFactory()("http"),
}: BridgeServerOptions): Server {
  const onerror = (err: Error) => log.error("MCP request failed", err);
  const mcp = createMcpHandler(buildServer, { legacy, responseMode: "json", onerror });
  const handler = toNodeHandler(mcp, { onerror });

  const server = createServer((request, response) => {
    const path = (request.url ?? "").split("?")[0] ?? "";
    if (path === HEALTH_PATH) {
      send(response, 200, { status: "ok" });
      return;
    }
    const route = path !== MCP_PATH && Object.hasOwn(routes, path) ? routes[path] : undefined;
    if (path !== MCP_PATH && !route) {
      send(response, 404, { error: "Unknown path." });
      return;
    }
    const presented = request.headers[TOKEN_HEADER];
    if (!sameSecret(typeof presented === "string" ? presented : "", token)) {
      send(response, 401, { error: "Missing or invalid authentication header." });
      return;
    }
    if (route) {
      Promise.resolve()
        .then(() => route(request))
        .then(
          (body) => send(response, 200, body),
          (err: unknown) => {
            log.error(`${path} failed`, err);
            send(response, 500, { error: "Internal error." });
          },
        );
      return;
    }
    readBody(request, maxBodyBytes)
      .then(
        (body) => handler(request, response, body),
        (err: unknown) => {
          if (!(err instanceof BodyError)) throw err;
          send(response, err.status, { error: err.message });
        },
      )
      .catch((err: unknown) => {
        log.error("request failed", err);
        if (!response.headersSent) send(response, 500, { error: "Internal error." });
        else response.end();
      });
  });
  server.on("close", () => void mcp.close());
  return server;
}

export interface ListenOptions {
  host: string;
  port: number;
  /** Run once the server has stopped accepting requests, before the process exits. */
  onShutdown?: () => void;
}

/** Listens, and closes cleanly on SIGINT / SIGTERM (`docker stop`). */
export async function listen(
  server: Server,
  { host, port, onShutdown }: ListenOptions,
): Promise<void> {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () =>
      server.close(() => {
        onShutdown?.();
        process.exit(0);
      }),
    );
  }
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
}

/** True when the module at `moduleUrl` (`import.meta.url`) is the one node was started on. */
export function isEntryPoint(moduleUrl: string): boolean {
  return Boolean(argv[1]) && moduleUrl === pathToFileURL(argv[1] ?? "").href;
}

/**
 * Runs `main`; a `ConfigError` becomes one log line and exit code 2, so that a misconfigured
 * container says why in `docker logs` instead of a stack trace.
 */
export async function runMain(
  main: () => Promise<void>,
  log: Logger = loggerFactory()("http"),
): Promise<void> {
  try {
    await main();
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    log.error(`invalid configuration, server not started: ${err.message}`);
    process.exit(2);
  }
}
