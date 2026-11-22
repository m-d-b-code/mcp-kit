// The kit tests itself with the config it exports, offline guard included.
import { mcpVitestConfig } from "./src/vitest.js";

export default mcpVitestConfig({ unsetEnv: ["MCP_KIT_TEST_SECRET"] });
