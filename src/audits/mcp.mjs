/**
 * 🔌 MCP (Model Context Protocol) — tool integrations that extend agent capabilities.
 */

export const section = 'MCP';

export const checks = [
  {
    id: 'mcp-json',
    label: '.mcp.json',
    section,
    weight: 2,
    paths: ['.mcp.json', 'mcp.json'],
    type: 'file',
    description: 'MCP server configuration for tool integrations',
    hint: 'echo \'{"mcpServers":{}}\' > .mcp.json',
  },
  {
    id: 'mcp-json-quality',
    label: 'MCP server count',
    section,
    weight: 3,
    paths: [],
    type: 'custom',
    custom: 'mcp-quality',
    description: 'Multiple MCP servers configured for richer agent capabilities',
  },
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
 * Custom check handler for this audit.
 */
export function analyze(rootDir, ctx) {
  const results = {};

  results['mcp-quality'] = (() => {
    for (const f of ['.mcp.json', 'mcp.json']) {
      const full = ctx.join(rootDir, f);
      if (ctx.existsSync(full)) {
        try {
          const config = JSON.parse(ctx.readFileSafe(full));
          const servers = config.mcpServers || config.servers || config;
          const count = typeof servers === 'object' ? Object.keys(servers).length : 0;
          return {
            found: count >= 2,
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
