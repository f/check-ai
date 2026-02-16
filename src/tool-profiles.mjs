/**
 * Tool Profiles — define which checks are relevant for each AI tool.
 *
 * Each profile specifies:
 * - required: checks that MUST pass for good tool support
 * - valuable: checks that improve the tool experience
 * - alternatives: pairs of checks where either satisfies the requirement
 * - notApplicable: checks that don't apply to this tool (excluded from score)
 *
 * Check IDs reference checks defined in src/audits/*.mjs
 */

export const TOOL_PROFILES = {
  // ═══════════════════════════════════════════════════════════════════
  //  CLIO — Command Line Intelligence Orchestrator
  // ═══════════════════════════════════════════════════════════════════
  clio: {
    name: 'CLIO',
    description: 'Perl-based AI coding assistant with long-term memory',
    icon: '💻',
    // These must exist for CLIO to work well
    required: [
      'clio-dir',           // .clio/ directory
      'clio-instructions',  // .clio/instructions.md
    ],
    // These improve the CLIO experience
    valuable: [
      'clio-ltm',           // .clio/ltm.json
      'clio-memory',        // .clio/memory/
      'clio-sessions',      // .clio/sessions/
      'agents-md',          // AGENTS.md
      'agents-md-quality',  // AGENTS.md quality
      'readme',             // README.md
      'readme-quality',     // README quality
      'test-dir',           // tests/
      'docs-dir',           // docs/
      'architecture-doc',   // Architecture documentation
      'conventions-doc',    // DEVELOPER_GUIDE.md etc
      'contributing',       // CONTRIBUTING.md
      'git-repo',           // .git
      'gitignore',          // .gitignore
      'ci-config',          // CI pipeline
      'license',            // LICENSE
    ],
    // Either check in pair satisfies the requirement
    alternatives: [
      ['agents-md', 'clio-instructions'],  // Either universal or CLIO-specific instructions
    ],
    // These don't apply to CLIO (excluded from tool score)
    notApplicable: [
      // Other tools' configs
      'cursorrules', 'cursor-rules-dir', 'cursorignore', 'cursorindexingignore',
      'windsurfrules', 'windsurf-rules-dir', 'windsurf-skills', 'windsurf-workflows',
      'claude-md', 'claude-dir', 'claude-settings', 'claude-commands',
      'copilot-instructions', 'copilot-instructions-dir', 'copilotignore',
      'codex-dir', 'codex-md', 'gemini-dir', 'aider-conf', 'roo-dir',
      'continue-config', 'amp-config', 'junie-guidelines', 'entire-dir',
      'opencode-json', 'opencode-dir', 'zed-rules', 'trae-rules',
      'clinerules', 'goosehints', 'amazonq-rules', 'augment-rules', 'qodo-config',
      // MCP config (CLIO has built-in MCP)
      'mcp-json', 'mcp-json-quality', 'mcp-dir',
      // AI SDK deps (CLIO IS the SDK)
      'ai-deps',
      // AI context files for other tools
      'aiignore', 'coderabbit', 'codeiumignore', 'aiderignore',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Cursor
  // ═══════════════════════════════════════════════════════════════════
  cursor: {
    name: 'Cursor',
    description: 'AI-first code editor',
    icon: '🖱️',
    required: [
      'has-any-agent-tool',  // At least some config
    ],
    valuable: [
      'cursorrules',
      'cursor-rules-dir',
      'cursorignore',
      'cursorindexingignore',
      'agents-md',
      'agents-md-quality',
      'readme',
      'readme-quality',
      'test-dir',
      'docs-dir',
      'architecture-doc',
      'conventions-doc',
      'contributing',
      'git-repo',
      'gitignore',
    ],
    alternatives: [
      ['cursorrules', 'cursor-rules-dir'],  // Either format works
      ['agents-md', 'cursorrules'],         // Universal or Cursor-specific
    ],
    notApplicable: [
      // Other tools' specific configs
      'clio-dir', 'clio-instructions', 'clio-ltm', 'clio-memory', 'clio-sessions',
      'windsurfrules', 'windsurf-rules-dir', 'windsurf-skills', 'windsurf-workflows',
      'claude-md', 'claude-dir', 'claude-settings', 'claude-commands',
      'codex-dir', 'codex-md', 'gemini-dir', 'aider-conf', 'roo-dir',
      'continue-config', 'junie-guidelines', 'entire-dir',
      'opencode-json', 'opencode-dir', 'zed-rules', 'trae-rules',
      'clinerules', 'goosehints', 'amazonq-rules', 'augment-rules', 'qodo-config',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Claude Code
  // ═══════════════════════════════════════════════════════════════════
  claude: {
    name: 'Claude Code',
    description: 'Anthropic Claude terminal assistant',
    icon: '🧠',
    required: [
      'has-any-agent-tool',
    ],
    valuable: [
      'claude-md',
      'claude-dir',
      'claude-settings',
      'claude-commands',
      'agents-md',
      'agents-md-quality',
      'readme',
      'readme-quality',
      'test-dir',
      'docs-dir',
      'architecture-doc',
      'conventions-doc',
      'contributing',
      'git-repo',
      'gitignore',
      'mcp-json',
      'mcp-json-quality',
    ],
    alternatives: [
      ['claude-md', 'agents-md'],  // Either CLAUDE.md or AGENTS.md
    ],
    notApplicable: [
      'clio-dir', 'clio-instructions', 'clio-ltm', 'clio-memory', 'clio-sessions',
      'cursorrules', 'cursor-rules-dir', 'cursorignore', 'cursorindexingignore',
      'windsurfrules', 'windsurf-rules-dir', 'windsurf-skills', 'windsurf-workflows',
      'codex-dir', 'codex-md', 'gemini-dir', 'aider-conf', 'roo-dir',
      'continue-config', 'junie-guidelines', 'entire-dir',
      'opencode-json', 'opencode-dir', 'zed-rules', 'trae-rules',
      'clinerules', 'goosehints', 'amazonq-rules', 'augment-rules', 'qodo-config',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Windsurf
  // ═══════════════════════════════════════════════════════════════════
  windsurf: {
    name: 'Windsurf',
    description: 'Codeium AI IDE',
    icon: '🏄',
    required: [
      'has-any-agent-tool',
    ],
    valuable: [
      'windsurfrules',
      'windsurf-rules-dir',
      'windsurf-skills',
      'windsurf-workflows',
      'agents-md',
      'agents-md-quality',
      'readme',
      'readme-quality',
      'test-dir',
      'docs-dir',
      'architecture-doc',
      'conventions-doc',
      'contributing',
      'git-repo',
      'gitignore',
      'codeiumignore',
      'skill-md',
    ],
    alternatives: [
      ['windsurfrules', 'windsurf-rules-dir'],
      ['agents-md', 'windsurfrules'],
    ],
    notApplicable: [
      'clio-dir', 'clio-instructions', 'clio-ltm', 'clio-memory', 'clio-sessions',
      'cursorrules', 'cursor-rules-dir', 'cursorignore', 'cursorindexingignore',
      'claude-md', 'claude-dir', 'claude-settings', 'claude-commands',
      'codex-dir', 'codex-md', 'gemini-dir', 'aider-conf', 'roo-dir',
      'continue-config', 'junie-guidelines', 'entire-dir',
      'opencode-json', 'opencode-dir', 'zed-rules', 'trae-rules',
      'clinerules', 'goosehints', 'amazonq-rules', 'augment-rules', 'qodo-config',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  GitHub Copilot
  // ═══════════════════════════════════════════════════════════════════
  copilot: {
    name: 'GitHub Copilot',
    description: 'GitHub AI pair programmer',
    icon: '🤖',
    required: [
      'has-any-agent-tool',
    ],
    valuable: [
      'copilot-instructions',
      'copilot-instructions-dir',
      'copilotignore',
      'agents-md',
      'agents-md-quality',
      'readme',
      'readme-quality',
      'test-dir',
      'docs-dir',
      'git-repo',
      'gitignore',
      'instructions-md',
    ],
    alternatives: [
      ['copilot-instructions', 'agents-md'],
    ],
    notApplicable: [
      'clio-dir', 'clio-instructions', 'clio-ltm', 'clio-memory', 'clio-sessions',
      'cursorrules', 'cursor-rules-dir', 'cursorignore', 'cursorindexingignore',
      'windsurfrules', 'windsurf-rules-dir', 'windsurf-skills', 'windsurf-workflows',
      'claude-md', 'claude-dir', 'claude-settings', 'claude-commands',
      'codex-dir', 'codex-md', 'gemini-dir', 'aider-conf', 'roo-dir',
      'continue-config', 'junie-guidelines', 'entire-dir',
      'opencode-json', 'opencode-dir', 'zed-rules', 'trae-rules',
      'clinerules', 'goosehints', 'amazonq-rules', 'augment-rules', 'qodo-config',
    ],
  },
};

/**
 * Get list of all defined tool keys.
 */
export function getToolKeys() {
  return Object.keys(TOOL_PROFILES);
}

/**
 * Get a specific tool profile by key.
 */
export function getToolProfile(toolKey) {
  return TOOL_PROFILES[toolKey] || null;
}

/**
 * Detect which tools are configured in the findings.
 * Returns array of tool keys that have at least one tool-specific check passing.
 */
export function detectConfiguredTools(findings) {
  const configured = [];
  const findingMap = new Map(findings.map(f => [f.id, f]));

  for (const [key, profile] of Object.entries(TOOL_PROFILES)) {
    // Check if required checks pass
    const hasRequired = profile.required.every(id => {
      const finding = findingMap.get(id);
      return finding && finding.found;
    });

    // Or check if any valuable tool-specific check passes
    const toolSpecificChecks = profile.valuable.filter(id =>
      id.startsWith(key) || id.startsWith(`${key}-`)
    );
    const hasToolSpecific = toolSpecificChecks.some(id => {
      const finding = findingMap.get(id);
      return finding && finding.found;
    });

    if (hasRequired || hasToolSpecific) {
      configured.push(key);
    }
  }

  return configured;
}
