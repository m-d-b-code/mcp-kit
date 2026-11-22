import { describe, expect, it } from "vitest";

import {
  ConfigError,
  readInteger,
  readListenConfig,
  readOptional,
  readToken,
} from "../src/index.js";

const TOKEN = "x".repeat(32);

describe("config", () => {
  it("refuses to start without a long enough token", () => {
    expect(() => readToken({}, "DEMO_MCP_TOKEN")).toThrow(ConfigError);
    expect(() => readToken({}, "DEMO_MCP_TOKEN")).toThrow(/DEMO_MCP_TOKEN is missing/);
    expect(() => readToken({ DEMO_MCP_TOKEN: "court" }, "DEMO_MCP_TOKEN")).toThrow(/32/);
    expect(readToken({ DEMO_MCP_TOKEN: ` ${TOKEN} ` }, "DEMO_MCP_TOKEN")).toBe(TOKEN);
  });

  it("reads the listening part from the project's prefix", () => {
    expect(readListenConfig({ DEMO_MCP_TOKEN: TOKEN }, "DEMO", 8788)).toEqual({
      token: TOKEN,
      host: "0.0.0.0",
      port: 8788,
    });
    expect(
      readListenConfig(
        { DEMO_MCP_TOKEN: TOKEN, DEMO_MCP_PORT: "9000", DEMO_MCP_HOST: "127.0.0.1" },
        "DEMO",
        8788,
      ),
    ).toMatchObject({ host: "127.0.0.1", port: 9000 });
    expect(() =>
      readListenConfig({ DEMO_MCP_TOKEN: TOKEN, DEMO_MCP_PORT: "70000" }, "DEMO", 8788),
    ).toThrow('invalid DEMO_MCP_PORT: "70000"');
  });

  it("takes a blank value for an absent one", () => {
    expect(readOptional({ A: "  " }, "A")).toBeNull();
    expect(readInteger({ N: "" }, "N", 6, 0, 168)).toBe(6);
    expect(() => readInteger({ N: "1.5" }, "N", 6, 0, 168)).toThrow(/invalid N/);
  });
});
