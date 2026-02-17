/**
 * 🧩 Prompts & Skills — reusable prompt templates and agent skill definitions.
 *
 * Scoring philosophy: having ANY ONE prompt template or skill earns a big bonus.
 */

import { existsSync } from 'fs';
import { join } from 'path';

export const section = 'Prompts & Skills';

const PROMPT_SIGNALS = [
  'prompts',
  '.prompts',
  '.ai/prompts',
  '.claude/commands',
];

export const checks = [
  // Bonus: having ANY prompt or skill file is the big signal.
  {
    id: 'has-any-prompt-or-skill',
    label: 'At least one prompt or skill',
    section,
    weight: 8,
    paths: [],
    type: 'custom',
    custom: 'has-any-prompt-or-skill',
    description: 'Repo has at least one prompt template, skill definition, or command',
    hint: 'mkdir -p prompts  # or add a SKILL.md',
  },

  {
    id: 'prompt-yml',
    label: '.prompt.yml files',
    section,
    weight: 0,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.prompt.yml',
    description: 'Structured prompt templates for repeatable AI workflows',
  },
  {
    id: 'prompt-md',
    label: '.prompt.md files',
    section,
    weight: 0,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.prompt.md',
    description: 'Markdown prompt templates',
  },
  {
    id: 'prompts-dir',
    label: 'prompts/ directory',
    section,
    weight: 0,
    paths: ['prompts', '.prompts', '.ai/prompts'],
    type: 'dir',
    description: 'Centralized prompt library directory',
  },
  {
    id: 'skill-md',
    label: 'SKILL.md files',
    section,
    weight: 0,
    paths: [],
    type: 'deep-scan',
    deepPattern: 'SKILL.md',
    description: 'Agent skill definitions (progressive disclosure)',
  },
  {
    id: 'claude-commands',
    label: '.claude/commands/',
    section,
    weight: 0,
    paths: ['.claude/commands'],
    type: 'dir',
    description: 'Custom Claude slash commands',
  },
];

/**
 * Custom check handlers for this audit.
 */
export function analyze(rootDir, ctx) {
  const results = {};

  results['has-any-prompt-or-skill'] = (() => {
    // Check static directories
    const matched = PROMPT_SIGNALS.filter((p) => existsSync(join(rootDir, p)));

    // Also check deep-scan results passed via ctx for SKILL.md / .prompt.md / .prompt.yml
    const deepHits = ctx.deepScanResults || {};
    for (const pattern of ['SKILL.md', '.prompt.md', '.prompt.yml']) {
      if (deepHits[pattern] && deepHits[pattern].length > 0) {
        matched.push(pattern);
      }
    }

    return {
      found: matched.length > 0,
      detail: matched.length > 0 ? `${matched.length} source(s): ${matched.slice(0, 5).join(', ')}` : null,
    };
  })();

  return results;
}
