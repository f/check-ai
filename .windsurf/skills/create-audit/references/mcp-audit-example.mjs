/**
 * 🔌 MCP (Model Context Protocol) — complete example of an audit with analyze().
 *
 * This file is a reference example, not loaded by the scanner.
 * Copy and adapt it for your own custom audit.
 */

export const section = 'MCP';

export const checks = [
  // Static check: does the file exist?
  {
    id: 'mcp-json',
    label: '.mcp.json',
    section,
    weight: 6,
    paths: ['.mcp.json', 'mcp.json'],
    type: 'file',
    description: 'MCP server configuration for tool integrations',
  },

  // Custom check: analyze the file contents
  {
    id: 'mcp-json-quality',
    label: 'MCP server count',
    section,
    weight: 3,
    paths: [],
    type: 'custom',
    custom: 'mcp-quality', // ← must match a key returned by analyze()
    description: 'Multiple MCP servers configured for richer agent capabilities',
  },

  // Static check: directory existence
  {
    id: 'mcp-dir',
    label: '.mcp/ directory',
    section,
    weight: 2,
    paths: ['.mcp'],
    type: 'dir',
    description: 'MCP server definitions directory',
  },
];

/**
 * Custom check handler.
 *
 * @param {string} rootDir - Absolute path to repo root
 * @param {object} ctx     - Utilities: { existsSync, statSync, readFileSync,
 *                           readFileSafe, readdirSync, join, relative,
 *                           lineCount, dirItemCount }
 * @returns {object} Keys must match the `custom` field of checks above.
 *                   Each value: { found: boolean, detail?: string, matches?: string[] }
 */
export function analyze(rootDir, ctx) {
  const results = {};

  // 'mcp-quality' matches the custom field in the check above
  results['mcp-quality'] = (() => {
    // Try multiple candidate file names
    for (const f of ['.mcp.json', 'mcp.json']) {
      const full = ctx.join(rootDir, f);
      if (ctx.existsSync(full)) {
        try {
          // Read and parse the file
          const config = JSON.parse(ctx.readFileSafe(full));

          // MCP configs store servers under different keys
          const servers = config.mcpServers || config.servers || config;
          const count = typeof servers === 'object' ? Object.keys(servers).length : 0;

          return {
            found: count >= 2, // pass if 2+ servers configured
            detail: count >= 2 ? `${count} server(s): ${Object.keys(servers).slice(0, 8).join(', ')}` : null,
          };
        } catch {
          return { found: false };
        }
      }
    }
    return { found: false };
  })();

  return results;
}
