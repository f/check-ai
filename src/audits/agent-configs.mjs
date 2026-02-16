/**
 * 🤖 Agent Configs — AI tool configurations and agent instruction files.
 *
 * Scoring philosophy: having ANY ONE tool configured earns a big bonus.
 * People use Cursor OR Windsurf OR Claude Code — not all at once.
 */

import { existsSync } from 'fs';
import { join } from 'path';

export const section = 'Agent Configs';

// Paths used by the "has any agent tool" bonus check
const TOOL_SIGNALS = [
  '.cursorrules',
  '.cursor/rules',
  '.windsurfrules',
  '.windsurf/rules',
  'CLAUDE.md',
  'claude.md',
  '.claude',
  '.github/copilot-instructions.md',
  'AGENTS.md',
  'agents.md',
  '.codex',
  'CODEX.md',
  '.gemini',
  '.aider.conf.yml',
  '.aider.conf.yaml',
  '.roo',
  '.continue',
  '.continuerc.json',
  '.junie',
  '.entire',
  'opencode.json',
  '.opencode',
  '.rules',
  '.trae',
  '.trae/rules',
  '.clinerules',
  '.goosehints',
  '.amazonq',
  '.amazonq/rules',
  '.augment',
  '.augment/rules',
  '.augment-guidelines.md',
  '.qodo',
  '.kiro',
  // CLIO - Perl-based AI coding assistant
  '.clio',
  '.clio/instructions.md',
];

export const checks = [
  // Bonus: having ANY agent tool configured is the big signal.
  {
    id: 'has-any-agent-tool',
    label: 'At least one AI tool configured',
    section,
    weight: 20,
    paths: [],
    type: 'custom',
    custom: 'has-any-agent-tool',
    description: 'Repo has config for at least one AI coding tool (Cursor, Windsurf, Claude, Copilot, etc.)',
  },

  // Universal
  {
    id: 'agents-md',
    label: 'AGENTS.md',
    section,
    weight: 10,
    paths: ['AGENTS.md', 'agents.md'],
    type: 'file',
    description: 'Universal agent instructions — the cross-tool standard',
  },
  {
    id: 'agents-md-quality',
    label: 'AGENTS.md quality',
    section,
    weight: 5,
    paths: [],
    type: 'custom',
    custom: 'agents-md-quality',
    description: 'AGENTS.md covers build, test, style, and project overview',
  },
  {
    id: 'agents-md-nested',
    label: 'Nested AGENTS.md',
    section,
    weight: 4,
    paths: [],
    type: 'deep-scan',
    deepPattern: 'AGENTS.md',
    description: 'Sub-directory AGENTS.md for module-specific instructions',
  },
  {
    id: 'agents-dir',
    label: '.agents/ directory',
    section,
    weight: 4,
    paths: ['.agents'],
    type: 'dir',
    description: 'Organized AI assets directory (skills, plans, tmp)',
  },
  {
    id: 'agents-skills',
    label: '.agents/skills/',
    section,
    weight: 4,
    paths: ['.agents/skills'],
    type: 'dir',
    description: 'Reusable agent skills with progressive disclosure',
  },

  // Claude Code
  {
    id: 'claude-md',
    label: 'CLAUDE.md',
    section,
    weight: 0,
    paths: ['CLAUDE.md', 'claude.md'],
    type: 'file',
    description: 'Claude Code project instructions',
  },
  {
    id: 'claude-dir',
    label: '.claude/',
    section,
    weight: 0,
    paths: ['.claude'],
    type: 'dir',
    description: 'Claude settings, skills, and commands',
  },
  {
    id: 'claude-settings',
    label: '.claude/settings.json',
    section,
    weight: 0,
    paths: ['.claude/settings.json', '.claude/settings.local.json'],
    type: 'file',
    description: 'Claude project settings (permissions, allowed tools)',
  },

  // Cursor
  {
    id: 'cursorrules',
    label: '.cursorrules',
    section,
    weight: 0,
    paths: ['.cursorrules'],
    type: 'file',
    description: 'Cursor AI rules file (legacy format)',
  },
  {
    id: 'cursor-rules-dir',
    label: '.cursor/rules/',
    section,
    weight: 0,
    paths: ['.cursor/rules'],
    type: 'dir',
    description: 'Cursor project rules directory (recommended format)',
  },

  // Windsurf
  {
    id: 'windsurfrules',
    label: '.windsurfrules',
    section,
    weight: 0,
    paths: ['.windsurfrules'],
    type: 'file',
    description: 'Windsurf AI rules file (legacy format)',
  },
  {
    id: 'windsurf-rules-dir',
    label: '.windsurf/rules/',
    section,
    weight: 0,
    paths: ['.windsurf/rules'],
    type: 'dir',
    description: 'Windsurf rules directory — supports always-on, glob, model-decision, and manual activation',
  },
  {
    id: 'windsurf-skills',
    label: '.windsurf/skills/',
    section,
    weight: 0,
    paths: ['.windsurf/skills'],
    type: 'dir',
    description: 'Windsurf workspace-level skills (SKILL.md bundles)',
  },
  {
    id: 'windsurf-workflows',
    label: '.windsurf/workflows/',
    section,
    weight: 0,
    paths: ['.windsurf/workflows'],
    type: 'dir',
    description: 'Windsurf workflow sequences invoked via /command',
  },

  // GitHub Copilot
  {
    id: 'copilot-instructions',
    label: '.github/copilot-instructions.md',
    section,
    weight: 0,
    paths: ['.github/copilot-instructions.md'],
    type: 'file',
    description: 'GitHub Copilot project-level custom instructions',
  },
  {
    id: 'copilot-instructions-dir',
    label: '.github/instructions/',
    section,
    weight: 0,
    paths: ['.github/instructions'],
    type: 'dir',
    description: 'Scoped .instructions.md files for Copilot',
  },

  // OpenAI Codex
  {
    id: 'codex-dir',
    label: '.codex/',
    section,
    weight: 0,
    paths: ['.codex'],
    type: 'dir',
    description: 'OpenAI Codex configuration directory',
  },
  {
    id: 'codex-md',
    label: 'CODEX.md',
    section,
    weight: 0,
    paths: ['CODEX.md', 'codex.md'],
    type: 'file',
    description: 'OpenAI Codex instructions file',
  },

  // Google Gemini
  {
    id: 'gemini-dir',
    label: '.gemini/',
    section,
    weight: 0,
    paths: ['.gemini'],
    type: 'dir',
    description: 'Google Gemini CLI configuration',
  },

  // Aider
  {
    id: 'aider-conf',
    label: '.aider.conf.yml',
    section,
    weight: 0,
    paths: ['.aider.conf.yml', '.aider.conf.yaml', '.aiderignore'],
    type: 'file',
    description: 'Aider configuration file',
  },

  // Roo Code
  {
    id: 'roo-dir',
    label: '.roo/',
    section,
    weight: 0,
    paths: ['.roo'],
    type: 'dir',
    description: 'Roo Code rules and configuration',
  },

  // Continue.dev
  {
    id: 'continue-config',
    label: '.continue/',
    section,
    weight: 0,
    paths: ['.continue', '.continuerc.json'],
    type: 'any',
    description: 'Continue.dev configuration',
  },

  // Amp (Sourcegraph)
  {
    id: 'amp-config',
    label: 'AGENTS.md (Amp)',
    section,
    weight: 0,
    paths: ['ampcode.md', '.amp'],
    type: 'any',
    description: 'Sourcegraph Amp reads AGENTS.md (already counted)',
  },

  // JetBrains Junie
  {
    id: 'junie-guidelines',
    label: '.junie/ guidelines',
    section,
    weight: 0,
    paths: ['.junie', '.junie/guidelines.md'],
    type: 'any',
    description: 'JetBrains Junie agent guidelines',
  },

  // Entire HQ
  {
    id: 'entire-dir',
    label: '.entire/',
    section,
    weight: 0,
    paths: ['.entire'],
    type: 'dir',
    description: 'Entire HQ — captures AI agent sessions per git push',
  },

  // OpenCode
  {
    id: 'opencode-json',
    label: 'opencode.json',
    section,
    weight: 0,
    paths: ['opencode.json'],
    type: 'file',
    description: 'OpenCode project config (model, instructions, MCP servers)',
  },
  {
    id: 'opencode-dir',
    label: '.opencode/',
    section,
    weight: 0,
    paths: ['.opencode'],
    type: 'dir',
    description: 'OpenCode agents, commands, skills, and plugins directory',
  },

  // Zed
  {
    id: 'zed-rules',
    label: '.rules (Zed)',
    section,
    weight: 0,
    paths: ['.rules'],
    type: 'file',
    description: 'Zed editor project-level AI rules file',
  },

  // Trae (ByteDance)
  {
    id: 'trae-rules',
    label: '.trae/rules/',
    section,
    weight: 0,
    paths: ['.trae/rules', '.trae'],
    type: 'any',
    description: 'Trae IDE project rules directory',
  },

  // Cline
  {
    id: 'clinerules',
    label: '.clinerules',
    section,
    weight: 0,
    paths: ['.clinerules'],
    type: 'file',
    description: 'Cline AI assistant project rules file',
  },

  // Goose (Block)
  {
    id: 'goosehints',
    label: '.goosehints',
    section,
    weight: 0,
    paths: ['.goosehints'],
    type: 'file',
    description: 'Goose AI agent project hints file',
  },

  // Amazon Q Developer
  {
    id: 'amazonq-rules',
    label: '.amazonq/rules/',
    section,
    weight: 0,
    paths: ['.amazonq/rules', '.amazonq'],
    type: 'any',
    description: 'Amazon Q Developer project rules directory',
  },

  // Augment Code
  {
    id: 'augment-rules',
    label: '.augment/rules/',
    section,
    weight: 0,
    paths: ['.augment/rules', '.augment', '.augment-guidelines.md'],
    type: 'any',
    description: 'Augment Code project rules and guidelines',
  },

  // Qodo
  {
    id: 'qodo-config',
    label: '.qodo/',
    section,
    weight: 0,
    paths: ['.qodo'],
    type: 'any',
    description: 'Qodo AI code quality configuration',
  },

  // CLIO
  {
    id: 'clio-dir',
    label: '.clio/',
    section,
    weight: 0,
    paths: ['.clio'],
    type: 'dir',
    description: 'CLIO AI assistant configuration directory',
  },
  {
    id: 'clio-instructions-file',
    label: '.clio/instructions.md',
    section,
    weight: 0,
    paths: ['.clio/instructions.md'],
    type: 'file',
    description: 'CLIO project-specific agent instructions',
  },
];

/**
 * Custom check handlers for this audit.
 */
export function analyze(rootDir, ctx) {
  const results = {};

  // has-any-agent-tool
  results['has-any-agent-tool'] = (() => {
    const matched = TOOL_SIGNALS.filter((p) => existsSync(join(rootDir, p)));
    return {
      found: matched.length > 0,
      detail: matched.length > 0 ? `${matched.length} tool(s): ${matched.slice(0, 5).join(', ')}` : null,
    };
  })();

  // agents-md-quality
  results['agents-md-quality'] = (() => {
    const candidates = ['AGENTS.md', 'agents.md', 'CLAUDE.md', 'claude.md'];
    let bestFile = null;
    let bestContent = '';

    for (const f of candidates) {
      const full = ctx.join(rootDir, f);
      if (ctx.existsSync(full)) {
        const content = ctx.readFileSafe(full);
        if (content.length > bestContent.length) {
          bestFile = f;
          bestContent = content;
        }
      }
    }

    if (!bestContent) return { found: false };

    const lower = bestContent.toLowerCase();
    const signals = {
      hasBuildCommands:
        /\b(build|compile|install|setup)\b/.test(lower) &&
        /\b(run|command|npm|yarn|pnpm|make|cargo|pip|go)\b/.test(lower),
      hasTestInstructions: /\b(test|testing|spec|jest|vitest|pytest|rspec)\b/.test(lower),
      hasStyleGuide: /\b(style|convention|format|lint|naming|pattern)\b/.test(lower),
      hasProjectOverview: /\b(overview|architecture|structure|about|description)\b/.test(lower),
      hasCodeExamples: /```/.test(bestContent),
      hasHeadings: /^#{1,3}\s/m.test(bestContent),
    };

    const score = Object.values(signals).filter((v) => v === true).length;
    const quality = score >= 5 ? 'comprehensive' : score >= 3 ? 'good' : score >= 1 ? 'basic' : 'minimal';

    return {
      found: score >= 3,
      detail: score >= 3 ? `${quality} (${score}/6 signals in ${bestFile})` : null,
      analysis: { file: bestFile, signals, quality, score, maxScore: 6 },
    };
  })();

  return results;
}
