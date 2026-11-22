// The kit lints itself with the config it exports (node runs the TypeScript source directly).
import { mcpProjectConfig } from "./src/eslint.ts";

export default mcpProjectConfig({ root: import.meta.dirname });
