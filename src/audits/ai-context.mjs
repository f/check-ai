/**
 * 🔒 AI Context — files that control what AI agents can and cannot see.
 *
 * Scoring philosophy: having ANY ONE context/ignore file earns a big bonus.
 * People use Cursor OR Copilot OR Aider — not all at once.
 */

import { existsSync } from 'fs';
import { join } from 'path';

export const section = 'AI Context';

const CONTEXT_SIGNALS = [
  '.cursorignore',
  '.cursorindexingignore',
  '.aiignore',
  '.aiexclude',
  '.coderabbit.yaml',
  '.coderabbit.yml',
  '.copilotignore',
  '.codeiumignore',
  '.aiderignore',
  '.gitattributes',
];

export const checks = [
  // Bonus: having ANY context/ignore file is the big signal.
  {
    id: 'has-any-ai-context',
    label: 'At least one AI context file',
    section,
    weight: 8,
    paths: [],
    type: 'custom',
    custom: 'has-any-ai-context',
    description: 'Repo has at least one AI ignore or context control file',
    hint: 'touch .gitattributes  # or .cursorignore, .copilotignore',
  },

  {
    id: 'cursorignore',
    label: '.cursorignore',
    section,
    weight: 0,
    paths: ['.cursorignore'],
    type: 'file',
    description: 'Tells Cursor which files to exclude from indexing',
  },
  {
    id: 'cursorindexingignore',
    label: '.cursorindexingignore',
    section,
    weight: 0,
    paths: ['.cursorindexingignore'],
    type: 'file',
    description: 'Cursor indexing exclusion list',
  },
  {
    id: 'aiignore',
    label: '.aiignore / .aiexclude',
    section,
    weight: 0,
    paths: ['.aiignore', '.aiexclude'],
    type: 'file',
    description: 'Generic AI exclusion file',
  },
  {
    id: 'coderabbit',
    label: '.coderabbit.yaml',
    section,
    weight: 0,
    paths: ['.coderabbit.yaml', '.coderabbit.yml'],
    type: 'file',
    description: 'CodeRabbit AI code review configuration',
  },
  {
    id: 'copilotignore',
    label: '.copilotignore',
    section,
    weight: 0,
    paths: ['.copilotignore'],
    type: 'file',
    description: 'GitHub Copilot file exclusion list',
  },
  {
    id: 'codeiumignore',
    label: '.codeiumignore',
    section,
    weight: 0,
    paths: ['.codeiumignore'],
    type: 'file',
    description: 'Windsurf/Codeium global ignore file',
  },
  {
    id: 'vscode-instructions',
    label: '.instructions.md files',
    section,
    weight: 0,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.instructions.md',
    description: 'VS Code / Copilot scoped instruction files',
  },
  {
    id: 'aiderignore',
    label: '.aiderignore',
    section,
    weight: 0,
    paths: ['.aiderignore'],
    type: 'file',
    description: 'Aider file exclusion list for context control',
  },
  {
    id: 'gitattributes',
    label: '.gitattributes',
    section,
    weight: 0,
    paths: ['.gitattributes'],
    type: 'file',
    description: 'Language detection hints help AI tools classify files correctly',
    hint: 'touch .gitattributes',
  },
];

/**
 * Custom check handlers for this audit.
 */
export function analyze(rootDir) {
  const results = {};

  results['has-any-ai-context'] = (() => {
    const matched = CONTEXT_SIGNALS.filter((p) => existsSync(join(rootDir, p)));
    return {
      found: matched.length > 0,
      detail: matched.length > 0 ? `${matched.length} file(s): ${matched.slice(0, 5).join(', ')}` : null,
    };
  })();

  return results;
}
