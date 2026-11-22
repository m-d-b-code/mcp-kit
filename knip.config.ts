// The kit checks itself with the config it exports. Its entries are the package's `exports`,
// which knip maps from `dist/` back to `src/`.
import { mcpKnipConfig } from "./src/knip.js";

export default mcpKnipConfig();
