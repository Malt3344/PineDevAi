// Regenerates the generated parts of the Claude Code plugin in claude-plugin/:
//   - skills/pine-v6-strategy/reference.md, from lib/pine-reference.ts,
//     so the plugin and the in-app assistant share one Pine v6 reference
//   - .mcp.json, pointing at the PineDev deployment users connect to
//
// Usage: npm run plugin:build                     (https://www.pine-dev.com)
//        PINEDEV_URL=https://example.com npm run plugin:build
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const plugin = new URL("claude-plugin/plugins/pinedev/", root);

const site = (process.env.PINEDEV_URL ?? "https://www.pine-dev.com").replace(/\/$/, "");
new URL(site); // throws on a malformed URL rather than shipping one

const source = readFileSync(new URL("lib/pine-reference.ts", root), "utf8");
const match = /export const PINE_V6_API = `([\s\S]*?)`;/.exec(source);
if (!match) throw new Error("Could not find PINE_V6_API in lib/pine-reference.ts");

writeFileSync(
  new URL("skills/pine-v6-strategy/reference.md", plugin),
  `# Pine Script v6 built-in reference\n\nEvery built-in function signature, variable and constant in Pine Script v6. If something is not listed here, it does not exist in v6.\n\n\`\`\`text\n${match[1].trim()}\n\`\`\`\n`,
);

writeFileSync(
  new URL(".mcp.json", plugin),
  `${JSON.stringify({ mcpServers: { pinedev: { type: "http", url: `${site}/api/mcp` } } }, null, 2)}\n`,
);

console.log(`Plugin built for ${site}/api/mcp`);
