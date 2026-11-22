import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

import { jobReporter, parseJobRun, TOKEN_HEADER } from "../src/index.js";

const closers: (() => void)[] = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
});

async function receiver(status = 200) {
  const received: { url: string; token: unknown; body: unknown }[] = [];
  const server = createServer((req: IncomingMessage, res) => {
    let raw = "";
    req.on("data", (c: Buffer) => (raw += c.toString()));
    req.on("end", () => {
      received.push({
        url: req.url ?? "",
        token: req.headers[TOKEN_HEADER],
        body: JSON.parse(raw),
      });
      res.writeHead(status).end();
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  closers.push(() => server.close());
  return {
    root: `http://127.0.0.1:${(server.address() as AddressInfo).port}/ops/jobs/demo`,
    received,
  };
}

const logger = () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe("jobReporter", () => {
  it("posts each run under its name, with the bridge's header", async () => {
    const { root, received } = await receiver();
    const report = jobReporter({ JOBS_REPORT_URL: `${root}/`, JOBS_REPORT_TOKEN: "s" }, logger());
    report("sync", { ok: true, detail: "done", startedAt: 1 });
    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toEqual({
      url: "/ops/jobs/demo/sync",
      token: "s",
      body: { ok: true, detail: "done", startedAt: 1 },
    });
    // What the receiving side accepts.
    expect(parseJobRun(received[0]?.body)).toMatchObject({ ok: true, detail: "done" });
  });

  it("stays silent without its two variables, and warns when only one is set", () => {
    const log = logger();
    jobReporter({}, log)("sync", { ok: true, detail: "", startedAt: 1 });
    expect(log.warn).not.toHaveBeenCalled();
    jobReporter({ JOBS_REPORT_URL: "http://x" }, log);
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it("only logs a refused report", async () => {
    const { root } = await receiver(401);
    const log = logger();
    jobReporter({ JOBS_REPORT_URL: root, JOBS_REPORT_TOKEN: "s" }, log)("sync", {
      ok: false,
      detail: "failed",
      startedAt: 1,
    });
    await vi.waitFor(() =>
      expect(log.warn).toHaveBeenCalledWith("run of sync not reported: HTTP 401"),
    );
  });
});
