/**
 * 🔒 AI Context — files that control what AI agents can and cannot see.
 */

export const section = 'AI Context';

export const checks = [
  {
    id: 'cursorignore',
    label: '.cursorignore',
    section,
    weight: 3,
    paths: ['.cursorignore'],
    type: 'file',
    description: 'Tells Cursor which files to exclude from indexing',
  },
  {
    id: 'cursorindexingignore',
    label: '.cursorindexingignore',
    section,
    weight: 2,
    paths: ['.cursorindexingignore'],
    type: 'file',
    description: 'Cursor indexing exclusion list',
  },
  {
    id: 'aiignore',
    label: '.aiignore / .aiexclude',
    section,
    weight: 2,
    paths: ['.aiignore', '.aiexclude'],
    type: 'file',
    description: 'Generic AI exclusion file',
  },
  {
    id: 'coderabbit',
    label: '.coderabbit.yaml',
    section,
    weight: 2,
    paths: ['.coderabbit.yaml', '.coderabbit.yml'],
    type: 'file',
    description: 'CodeRabbit AI code review configuration',
  },
  {
    id: 'copilotignore',
    label: '.copilotignore',
    section,
    weight: 2,
    paths: ['.copilotignore'],
    type: 'file',
    description: 'GitHub Copilot file exclusion list',
  },
  {
    id: 'codeiumignore',
    label: '.codeiumignore',
    section,
    weight: 2,
    paths: ['.codeiumignore'],
    type: 'file',
    description: 'Windsurf/Codeium global ignore file',
  },
  {
    id: 'vscode-instructions',
    label: '.instructions.md files',
    section,
    weight: 2,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.instructions.md',
    description: 'VS Code / Copilot scoped instruction files',
  },
];
