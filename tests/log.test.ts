import { afterEach, describe, expect, it, vi } from "vitest";

import { loggerFactory } from "../src/index.js";

afterEach(() => vi.restoreAllMocks());

describe("loggerFactory", () => {
  it("writes on stderr from the project's level, info by default", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const env: NodeJS.ProcessEnv = {};
    const log = loggerFactory("DEMO_LOG_LEVEL", env)("http");
    log.debug("hidden");
    log.info("visible");
    expect(spy.mock.calls).toEqual([["[info] http: visible"]]);
    env.DEMO_LOG_LEVEL = "error";
    log.warn("hidden");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
