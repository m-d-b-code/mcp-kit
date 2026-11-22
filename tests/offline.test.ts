import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";

describe("offline guard", () => {
  it("refuses a request that leaves the machine", async () => {
    await expect(fetch("https://example.com/")).rejects.toThrow(/offline test/);
  });

  it("lets a request to the loopback through", async () => {
    const server = createServer((_req, res) => res.end("ok"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(await response.text()).toBe("ok");
    } finally {
      server.close();
    }
  });

  it("removes the listed variables from the environment", () => {
    expect(process.env.MCP_KIT_TEST_SECRET).toBeUndefined();
  });
});
