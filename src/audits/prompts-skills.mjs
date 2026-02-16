/**
 * 🧩 Prompts & Skills — reusable prompt templates and agent skill definitions.
 */

export const section = 'Prompts & Skills';

export const checks = [
  {
    id: 'prompt-yml',
    label: '.prompt.yml files',
    section,
    weight: 2,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.prompt.yml',
    description: 'Structured prompt templates for repeatable AI workflows',
  },
  {
    id: 'prompt-md',
    label: '.prompt.md files',
    section,
    weight: 3,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.prompt.md',
    description: 'Markdown prompt templates',
  },
  {
    id: 'prompts-dir',
    label: 'prompts/ directory',
    section,
    weight: 3,
    paths: ['prompts', '.prompts', '.ai/prompts'],
    type: 'dir',
    description: 'Centralized prompt library directory',
  },
  {
    id: 'skill-md',
    label: 'SKILL.md files',
    section,
    weight: 7,
    paths: [],
    type: 'deep-scan',
    deepPattern: 'SKILL.md',
    description: 'Agent skill definitions (progressive disclosure)',
  },
  {
    id: 'claude-commands',
    label: '.claude/commands/',
    section,
    weight: 3,
    paths: ['.claude/commands'],
    type: 'dir',
    description: 'Custom Claude slash commands',
  },
];
