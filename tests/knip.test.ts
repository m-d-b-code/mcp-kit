import { describe, expect, it } from "vitest";
import { mcpKnipConfig } from "../src/knip.js";

describe("mcpKnipConfig", () => {
  it("keeps knip's own entries unless the project adds some", () => {
    expect(mcpKnipConfig()).not.toHaveProperty("entry");
    expect(mcpKnipConfig({ entry: ["src/cli.ts"] }).entry).toEqual(["src/cli.ts"]);
  });

  it("passes the project's exclusions through", () => {
    const config = mcpKnipConfig({ ignore: ["src/gen/**"], ignoreDependencies: [/^@types\//] });
    expect(config.ignore).toEqual(["src/gen/**"]);
    expect(config.ignoreDependencies).toEqual([/^@types\//]);
  });
});
