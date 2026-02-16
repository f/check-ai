/**
 * 🧹 Repo Hygiene — foundational signals for a well-structured repository.
 */

import { execSync } from 'child_process';

export const section = 'Repo Hygiene';

export const checks = [
  {
    id: 'git-repo',
    label: '.git',
    section,
    weight: 5,
    paths: ['.git'],
    type: 'dir',
    description: 'Repository is under Git version control',
  },
  {
    id: 'gitignore',
    label: '.gitignore',
    section,
    weight: 5,
    paths: ['.gitignore'],
    type: 'file',
    description: 'Prevents tracking of generated / sensitive files',
  },
  {
    id: 'env-example',
    label: '.env.example / .env.sample',
    section,
    weight: 3,
    paths: ['.env.example', '.env.sample', '.env.template'],
    type: 'file',
    description: 'Documents required env vars without exposing secrets',
  },
  {
    id: 'editorconfig',
    label: '.editorconfig',
    section,
    weight: 2,
    paths: ['.editorconfig'],
    type: 'file',
    description: 'Consistent editor settings across contributors and agents',
  },
  {
    id: 'linter',
    label: 'Linter config',
    section,
    weight: 4,
    paths: [
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.cjs',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
      '.pylintrc',
      'pyproject.toml',
      'setup.cfg',
      'ruff.toml',
      '.rubocop.yml',
      '.golangci.yml',
      '.golangci.yaml',
    ],
    type: 'file',
    description: 'Linting enforces consistent style for humans and agents alike',
  },
  {
    id: 'formatter',
    label: 'Formatter config',
    section,
    weight: 3,
    paths: [
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yml',
      '.prettierrc.cjs',
      'prettier.config.js',
      'prettier.config.mjs',
      'prettier.config.cjs',
      '.prettierrc.toml',
      'biome.json',
      'biome.jsonc',
      'deno.json',
      'deno.jsonc',
      '.clang-format',
      'rustfmt.toml',
    ],
    type: 'file',
    description: 'Auto-formatting keeps agent-generated code consistent',
  },
  {
    id: 'ci-config',
    label: 'CI pipeline',
    section,
    weight: 4,
    paths: [
      '.github/workflows',
      '.gitlab-ci.yml',
      '.circleci',
      'Jenkinsfile',
      '.travis.yml',
      'bitbucket-pipelines.yml',
    ],
    type: 'any',
    description: 'CI pipeline catches agent regressions before they merge',
  },
  {
    id: 'scripts',
    label: 'Standard scripts',
    section,
    weight: 4,
    paths: [],
    type: 'custom',
    custom: 'scripts',
    description: 'Single obvious commands for start / test / lint',
  },
  {
    id: 'devcontainer',
    label: 'Dev container',
    section,
    weight: 3,
    paths: ['.devcontainer', '.devcontainer/devcontainer.json', '.devcontainer.json'],
    type: 'any',
    description: 'Reproducible dev environment for agents and contributors',
  },
  {
    id: 'commit-messages',
    label: 'Descriptive commits',
    section,
    weight: 3,
    paths: [],
    type: 'custom',
    custom: 'commit-messages',
    description: 'Recent commit messages are descriptive (not just "fix" or "update")',
  },
  {
    id: 'conventional-commits',
    label: 'Conventional commits',
    section,
    weight: 2,
    paths: [],
    type: 'custom',
    custom: 'conventional-commits',
    description: 'Commit messages follow conventional format (feat:, fix:, chore:, etc.)',
  },
];

/**
 * Custom check handler for this audit.
 */
export function analyze(rootDir, ctx) {
  const results = {};

  // scripts check
  results['scripts'] = (() => {
    const found = [];
    const missing = [];
    const desired = ['start', 'test', 'lint'];

    const pkgPath = ctx.join(rootDir, 'package.json');
    if (ctx.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(ctx.readFileSafe(pkgPath));
        const scripts = pkg.scripts || {};
        for (const s of desired) {
          if (scripts[s]) found.push(`npm run ${s}`);
          else missing.push(s);
        }
      } catch {
        /* ignore */
      }
    }

    const makefilePath = ctx.join(rootDir, 'Makefile');
    if (ctx.existsSync(makefilePath)) {
      try {
        const content = ctx.readFileSafe(makefilePath);
        for (const s of desired) {
          if (content.includes(`${s}:`)) {
            if (!found.some((f) => f.includes(s))) found.push(`make ${s}`);
            const idx = missing.indexOf(s);
            if (idx !== -1) missing.splice(idx, 1);
          }
        }
      } catch {
        /* ignore */
      }
    }

    const ok = found.length >= 2;
    return {
      found: ok,
      matches: found,
      detail: ok
        ? `${found.length}/3 (${found.join(', ')})`
        : found.length > 0
          ? `${found.length}/3 — missing: ${missing.join(', ')}`
          : null,
    };
  })();

  // git commit message checks
  const commits = getRecentCommits(rootDir);

  // Descriptive commit messages
  results['commit-messages'] = (() => {
    if (commits.length === 0) return { found: false, detail: 'no git history' };

    const lazy = /^(fix|update|wip|test|changes|stuff|misc|tmp|asdf|todo|\.|-)$/i;
    const good = commits.filter((m) => m.length >= 10 && !lazy.test(m.trim()));
    const ratio = good.length / commits.length;

    return {
      found: ratio >= 0.6,
      detail: `${good.length}/${commits.length} recent commits are descriptive`,
    };
  })();

  // Conventional commits (feat:, fix:, chore:, docs:, etc.)
  results['conventional-commits'] = (() => {
    if (commits.length === 0) return { found: false, detail: 'no git history' };

    const conventional = /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\(.+\))?!?:/i;
    const matching = commits.filter((m) => conventional.test(m.trim()));
    const ratio = matching.length / commits.length;

    return {
      found: ratio >= 0.5,
      detail: `${matching.length}/${commits.length} use conventional format`,
    };
  })();

  return results;
}

/**
 * Read the last 10 commit messages from git log.
 */
function getRecentCommits(rootDir) {
  try {
    const output = execSync('git log --oneline --no-decorate -n 10 --format=%s', {
      cwd: rootDir,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output
      .trim()
      .split('\n')
      .filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}
