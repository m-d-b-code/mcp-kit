import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";

import {
  createBridgeServer,
  MCP_PATH,
  PROTOCOL_VERSION,
  sameSecret,
  TOKEN_HEADER,
} from "../src/index.js";

const TOKEN = "x".repeat(32);
const silent = { debug() {}, info() {}, warn() {}, error() {} };

const opened: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of opened.splice(0)) await close();
});

function buildServer(): McpServer {
  const server = new McpServer({ name: "kit-test", version: "1.0.0" });
  server.registerTool(
    "ping",
    { description: "Answers pong.", annotations: { readOnlyHint: true } },
    () => ({ content: [{ type: "text", text: "pong" }] }),
  );
  return server;
}

async function listening(
  options: { maxBodyBytes?: number; legacy?: "stateless" | "reject" } = {},
): Promise<string> {
  const server = createBridgeServer({ token: TOKEN, buildServer, log: silent, ...options });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  opened.push(() => new Promise((done) => server.close(() => done())));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function connected(base: string): Promise<Client> {
  const client = new Client(
    { name: "tests", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: PROTOCOL_VERSION } } },
  );
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${base}${MCP_PATH}`), {
      requestInit: { headers: { [TOKEN_HEADER]: TOKEN } },
    }),
  );
  opened.push(() => client.close());
  return client;
}

const post = (base: string, body: string, token = TOKEN) =>
  fetch(`${base}${MCP_PATH}`, {
    method: "POST",
    headers: {
      [TOKEN_HEADER]: token,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body,
  });

describe("sameSecret", () => {
  it("never accepts an empty secret, and compares whatever the length", () => {
    expect(sameSecret("", TOKEN)).toBe(false);
    expect(sameSecret("x", TOKEN)).toBe(false);
    expect(sameSecret(TOKEN, TOKEN)).toBe(true);
  });
});

describe("bridge server", () => {
  it("answers the healthcheck without a token, and nothing else", async () => {
    const base = await listening();
    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect((await fetch(`${base}/mcp`, { method: "POST" })).status).toBe(401);
    expect((await post(base, "{}", "y".repeat(32))).status).toBe(401);
    expect((await fetch(`${base}/other`)).status).toBe(404);
  });

  it("speaks the pinned revision and serves the project's tools", async () => {
    const client = await connected(await listening());
    expect(client.getNegotiatedProtocolVersion()).toBe(PROTOCOL_VERSION);
    const { tools } = await client.listTools();
    expect(tools.map((t) => [t.name, t.annotations?.readOnlyHint])).toEqual([["ping", true]]);
    const result = await client.callTool({ name: "ping", arguments: {} });
    expect(result.content).toEqual([{ type: "text", text: "pong" }]);
  });

  it("serves a 2025 client by default, and refuses it in strict mode", async () => {
    const initialize = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "old", version: "1.0.0" },
      },
    });
    const served = await post(await listening(), initialize);
    expect(served.status).toBe(200);
    expect(await served.text()).toContain('"protocolVersion":"2025-06-18"');

    const refused = await post(await listening({ legacy: "reject" }), initialize);
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({
      error: { data: { supported: [PROTOCOL_VERSION] } },
    });
  });

  it("bounds the body and rejects what is not JSON", async () => {
    const base = await listening({ maxBodyBytes: 1024 });
    const big = await post(base, JSON.stringify({ pad: "x".repeat(2048) }));
    expect(big.status).toBe(413);
    expect(await big.json()).toEqual({ error: "Request body too large." });
    expect((await post(base, "{not json")).status).toBe(400);
  });
});
