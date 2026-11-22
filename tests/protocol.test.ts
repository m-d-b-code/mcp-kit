import { describe, expect, it } from "vitest";

import { JOB_RUN_MAX_AGE_MS, parseJobRun } from "../src/protocol.js";

describe("parseJobRun", () => {
  const now = 1_800_000_000_000;

  it("needs ok as a boolean, and nothing else", () => {
    expect(parseJobRun(null, now)).toBeUndefined();
    expect(parseJobRun({ ok: "true" }, now)).toBeUndefined();
    expect(parseJobRun({ ok: false }, now)).toEqual({ ok: false, detail: "", startedAt: now });
  });

  it("keeps a plausible start and replaces the others", () => {
    expect(parseJobRun({ ok: true, detail: "3 rows", startedAt: now - 1000 }, now)).toEqual({
      ok: true,
      detail: "3 rows",
      startedAt: now - 1000,
    });
    expect(parseJobRun({ ok: true, startedAt: now + 1 }, now)?.startedAt).toBe(now);
    expect(parseJobRun({ ok: true, startedAt: now - JOB_RUN_MAX_AGE_MS }, now)?.startedAt).toBe(
      now,
    );
  });
});
