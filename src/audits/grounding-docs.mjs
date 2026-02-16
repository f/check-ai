/**
 * 📄 Grounding Docs — documentation that helps AI agents understand the project.
 */

export const section = 'Grounding Docs';

export const checks = [
  {
    id: 'readme',
    label: 'README.md',
    section,
    weight: 5,
    paths: ['README.md', 'readme.md', 'README', 'Readme.md'],
    type: 'file',
    description: 'Project overview for humans and agents',
  },
  {
    id: 'readme-quality',
    label: 'README quality',
    section,
    weight: 3,
    paths: [],
    type: 'custom',
    custom: 'readme-quality',
    description: 'README has install instructions, usage examples, and structure',
  },
  {
    id: 'contributing',
    label: 'CONTRIBUTING.md',
    section,
    weight: 2,
    paths: ['CONTRIBUTING.md', 'contributing.md', '.github/CONTRIBUTING.md'],
    type: 'file',
    description: 'Contribution guidelines help agents follow project conventions',
  },
  {
    id: 'architecture-doc',
    label: 'Architecture doc',
    section,
    weight: 4,
    paths: [
      'architecture.md',
      'ARCHITECTURE.md',
      'docs/architecture.md',
      '.ai/docs/architecture.md',
      'ARCHITECTURE',
      'docs/ARCHITECTURE.md',
    ],
    type: 'file',
    description: 'High-level architecture reference for agents tackling large tasks',
  },
  {
    id: 'tech-stack-doc',
    label: 'Tech stack doc',
    section,
    weight: 3,
    paths: ['tech-stack.md', 'TECH-STACK.md', 'docs/tech-stack.md', '.ai/docs/tech-stack.md'],
    type: 'file',
    description: 'Prevents agents from introducing unwanted frameworks',
  },
  {
    id: 'ai-requirements',
    label: 'AI requirements / PRDs',
    section,
    weight: 3,
    paths: ['.ai/requirements', '.ai/docs', 'docs/requirements', 'docs/prd'],
    type: 'dir',
    description: 'Product specs that ground agent work in business intent',
  },
  {
    id: 'llms-txt',
    label: 'llms.txt',
    section,
    weight: 3,
    paths: ['llms.txt', 'llms-full.txt'],
    type: 'file',
    description: 'LLM-friendly project description (llms.txt standard)',
  },
  {
    id: 'changelog',
    label: 'CHANGELOG.md',
    section,
    weight: 2,
    paths: ['CHANGELOG.md', 'changelog.md', 'CHANGES.md', 'HISTORY.md'],
    type: 'file',
    description: 'Change history helps agents understand recent project evolution',
  },
  {
    id: 'conventions-doc',
    label: 'Conventions / Development doc',
    section,
    weight: 3,
    paths: [
      'CONVENTIONS.md',
      'conventions.md',
      'DEVELOPMENT.md',
      'development.md',
      'docs/conventions.md',
      'docs/development.md',
      'CODING_GUIDELINES.md',
      'docs/DEVELOPER_GUIDE.md',
      'docs/developer_guide.md',
      'DEVELOPER_GUIDE.md',
    ],
    type: 'file',
    description: 'Coding conventions and development setup guide for agents',
  },
  {
    id: 'api-docs',
    label: 'API documentation',
    section,
    weight: 2,
    paths: ['docs/api', 'API.md', 'api.md', 'docs/API.md'],
    type: 'any',
    description: 'API reference helps agents understand interfaces and contracts',
  },
  {
    id: 'docs-dir',
    label: 'docs/ directory',
    section,
    weight: 2,
    paths: ['docs', 'doc'],
    type: 'dir',
    description: 'Organized documentation directory for project knowledge',
  },
];

/**
 * Custom check handler for this audit.
 */
export function analyze(rootDir, ctx) {
  const results = {};

  // README quality
  results['readme-quality'] = (() => {
    const candidates = ['README.md', 'readme.md', 'Readme.md'];
    let content = '';

    for (const f of candidates) {
      const full = ctx.join(rootDir, f);
      if (ctx.existsSync(full)) {
        content = ctx.readFileSafe(full);
        break;
      }
    }

    if (!content) return { found: false };

    const lower = content.toLowerCase();
    const signals = {
      hasInstallation: /\b(install|setup|getting.started|quick.start)\b/.test(lower),
      hasUsage: /\b(usage|how.to.use|example|demo)\b/.test(lower),
      hasStructure: /\b(structure|directory|folder|layout|architecture)\b/.test(lower),
      hasCodeBlocks: /```/.test(content),
      hasHeadings: (content.match(/^#{1,3}\s/gm) || []).length >= 3,
      isSubstantial: content.split('\n').filter((l) => l.trim()).length >= 20,
    };

    const score = Object.values(signals).filter((v) => v === true).length;
    const detail = score >= 4 ? 'rich' : score >= 2 ? 'adequate' : 'sparse';

    return { found: score >= 3, signals, detail, score, maxScore: 6 };
  })();

  return results;
}
