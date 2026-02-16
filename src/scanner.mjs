import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

// ─── Ignored directories during tree walks ────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', 'vendor', 'dist', 'build', '.git',
  '__pycache__', '.next', '.nuxt', '.output', 'coverage',
  '.turbo', '.vercel', '.netlify', '.cache', '.parcel-cache',
  'target', 'out', 'bin', 'obj',
]);

// ─── AI-related npm packages (for intelligent dep detection) ──────────
const AI_PACKAGES = new Set([
  'openai', '@openai/agents',
  '@anthropic-ai/sdk', '@anthropic-ai/bedrock-sdk',
  'langchain', '@langchain/core', '@langchain/openai', '@langchain/anthropic',
  'llamaindex',
  'ai', '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google',
  '@google/generative-ai', '@google-cloud/vertexai',
  'ollama', 'ollama-ai-provider',
  'cohere-ai', 'replicate',
  'huggingface', '@huggingface/inference',
  '@modelcontextprotocol/sdk', '@modelcontextprotocol/server-stdio',
  'chromadb', 'pinecone', '@pinecone-database/pinecone',
  'weaviate-ts-client',
  'tiktoken', 'gpt-tokenizer', 'js-tiktoken',
]);

// ─── AI-related Python packages ───────────────────────────────────────
const AI_PY_PACKAGES = [
  'openai', 'anthropic', 'langchain', 'llama-index', 'llamaindex',
  'transformers', 'torch', 'tensorflow', 'keras',
  'chromadb', 'pinecone-client', 'weaviate-client',
  'crewai', 'autogen', 'smolagents',
  'mcp',
];

// ═══════════════════════════════════════════════════════════════════════
//  CHECK DEFINITIONS — grouped into audit sections
// ═══════════════════════════════════════════════════════════════════════

const CHECKS = [

  // ── 1. REPO HYGIENE ─────────────────────────────────────────────────
  {
    id: 'git-repo',
    label: '.git',
    section: 'Repo Hygiene',
    weight: 5,
    paths: ['.git'],
    type: 'dir',
    description: 'Repository is under Git version control',
  },
  {
    id: 'gitignore',
    label: '.gitignore',
    section: 'Repo Hygiene',
    weight: 5,
    paths: ['.gitignore'],
    type: 'file',
    description: 'Prevents tracking of generated / sensitive files',
  },
  {
    id: 'env-example',
    label: '.env.example / .env.sample',
    section: 'Repo Hygiene',
    weight: 3,
    paths: ['.env.example', '.env.sample', '.env.template'],
    type: 'file',
    description: 'Documents required env vars without exposing secrets',
  },
  {
    id: 'editorconfig',
    label: '.editorconfig',
    section: 'Repo Hygiene',
    weight: 2,
    paths: ['.editorconfig'],
    type: 'file',
    description: 'Consistent editor settings across contributors and agents',
  },
  {
    id: 'linter',
    label: 'Linter config',
    section: 'Repo Hygiene',
    weight: 4,
    paths: [
      '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.cjs',
      'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs',
      '.pylintrc', 'pyproject.toml', 'setup.cfg', 'ruff.toml',
      '.rubocop.yml',
      '.golangci.yml', '.golangci.yaml',
    ],
    type: 'file',
    description: 'Linting enforces consistent style for humans and agents alike',
  },
  {
    id: 'formatter',
    label: 'Formatter config',
    section: 'Repo Hygiene',
    weight: 3,
    paths: [
      '.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.cjs',
      'prettier.config.js', 'prettier.config.mjs', 'prettier.config.cjs',
      '.prettierrc.toml',
      'biome.json', 'biome.jsonc',
      'deno.json', 'deno.jsonc',
      '.clang-format', 'rustfmt.toml',
    ],
    type: 'file',
    description: 'Auto-formatting keeps agent-generated code consistent',
  },
  {
    id: 'ci-config',
    label: 'CI pipeline',
    section: 'Repo Hygiene',
    weight: 4,
    paths: [
      '.github/workflows', '.gitlab-ci.yml', '.circleci',
      'Jenkinsfile', '.travis.yml', 'bitbucket-pipelines.yml',
    ],
    type: 'any',
    description: 'CI pipeline catches agent regressions before they merge',
  },
  {
    id: 'scripts',
    label: 'Standard scripts',
    section: 'Repo Hygiene',
    weight: 4,
    paths: [],
    type: 'custom',
    custom: 'scripts',
    description: 'Single obvious commands for start / test / lint',
  },
  {
    id: 'devcontainer',
    label: 'Dev container',
    section: 'Repo Hygiene',
    weight: 3,
    paths: ['.devcontainer', '.devcontainer/devcontainer.json', '.devcontainer.json'],
    type: 'any',
    description: 'Reproducible dev environment for agents and contributors',
  },

  // ── 2. GROUNDING DOCUMENTS ──────────────────────────────────────────
  {
    id: 'readme',
    label: 'README.md',
    section: 'Grounding Docs',
    weight: 5,
    paths: ['README.md', 'readme.md', 'README', 'Readme.md'],
    type: 'file',
    description: 'Project overview for humans and agents',
  },
  {
    id: 'readme-quality',
    label: 'README quality',
    section: 'Grounding Docs',
    weight: 3,
    paths: [],
    type: 'custom',
    custom: 'readme-quality',
    description: 'README has install instructions, usage examples, and structure',
  },
  {
    id: 'contributing',
    label: 'CONTRIBUTING.md',
    section: 'Grounding Docs',
    weight: 2,
    paths: ['CONTRIBUTING.md', 'contributing.md', '.github/CONTRIBUTING.md'],
    type: 'file',
    description: 'Contribution guidelines help agents follow project conventions',
  },
  {
    id: 'architecture-doc',
    label: 'Architecture doc',
    section: 'Grounding Docs',
    weight: 4,
    paths: [
      'architecture.md', 'ARCHITECTURE.md',
      'docs/architecture.md', '.ai/docs/architecture.md',
      'ARCHITECTURE', 'docs/ARCHITECTURE.md',
    ],
    type: 'file',
    description: 'High-level architecture reference for agents tackling large tasks',
  },
  {
    id: 'tech-stack-doc',
    label: 'Tech stack doc',
    section: 'Grounding Docs',
    weight: 3,
    paths: [
      'tech-stack.md', 'TECH-STACK.md',
      'docs/tech-stack.md', '.ai/docs/tech-stack.md',
    ],
    type: 'file',
    description: 'Prevents agents from introducing unwanted frameworks',
  },
  {
    id: 'ai-requirements',
    label: 'AI requirements / PRDs',
    section: 'Grounding Docs',
    weight: 3,
    paths: ['.ai/requirements', '.ai/docs', 'docs/requirements', 'docs/prd'],
    type: 'dir',
    description: 'Product specs that ground agent work in business intent',
  },
  {
    id: 'llms-txt',
    label: 'llms.txt',
    section: 'Grounding Docs',
    weight: 3,
    paths: ['llms.txt', 'llms-full.txt'],
    type: 'file',
    description: 'LLM-friendly project description (llms.txt standard)',
  },

  // ── 3. TESTING SAFETY NET ───────────────────────────────────────────
  {
    id: 'test-dir',
    label: 'Test directory',
    section: 'Testing',
    weight: 5,
    paths: [
      'tests', 'test', '__tests__', 'spec', 'specs',
      'src/tests', 'src/__tests__', 'src/test',
      'e2e', 'cypress', 'playwright',
    ],
    type: 'dir',
    description: 'Tests catch agent-introduced regressions',
  },
  {
    id: 'test-config',
    label: 'Test runner config',
    section: 'Testing',
    weight: 3,
    paths: [
      'jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.cjs',
      'vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs',
      'playwright.config.ts', 'playwright.config.js',
      'cypress.config.ts', 'cypress.config.js',
      'pytest.ini', 'conftest.py', '.rspec',
    ],
    type: 'file',
    description: 'Configured test runner for automated verification',
  },
  {
    id: 'coverage-config',
    label: 'Coverage config',
    section: 'Testing',
    weight: 2,
    paths: [
      '.nycrc', '.nycrc.json', '.c8rc.json',
      '.coveragerc', 'codecov.yml', '.codecov.yml',
    ],
    type: 'file',
    description: 'Coverage tracking ensures agent changes maintain quality',
  },

  // ── 4. AI AGENT CONFIGS ─────────────────────────────────────────────
  {
    id: 'agents-md',
    label: 'AGENTS.md',
    section: 'Agent Configs',
    weight: 15,
    paths: ['AGENTS.md', 'agents.md'],
    type: 'file',
    description: 'Universal agent instructions — the cross-tool standard',
  },
  {
    id: 'agents-md-quality',
    label: 'AGENTS.md quality',
    section: 'Agent Configs',
    weight: 6,
    paths: [],
    type: 'custom',
    custom: 'agents-md-quality',
    description: 'AGENTS.md covers build, test, style, and project overview',
  },
  {
    id: 'agents-md-nested',
    label: 'Nested AGENTS.md',
    section: 'Agent Configs',
    weight: 4,
    paths: [],
    type: 'deep-scan',
    deepPattern: 'AGENTS.md',
    description: 'Sub-directory AGENTS.md for module-specific instructions',
  },
  {
    id: 'agents-dir',
    label: '.agents/ directory',
    section: 'Agent Configs',
    weight: 4,
    paths: ['.agents'],
    type: 'dir',
    description: 'Organized AI assets directory (skills, plans, tmp)',
  },
  {
    id: 'agents-skills',
    label: '.agents/skills/',
    section: 'Agent Configs',
    weight: 4,
    paths: ['.agents/skills'],
    type: 'dir',
    description: 'Reusable agent skills with progressive disclosure',
  },
  {
    id: 'claude-md',
    label: 'CLAUDE.md',
    section: 'Agent Configs',
    weight: 8,
    paths: ['CLAUDE.md', 'claude.md'],
    type: 'file',
    description: 'Claude Code project instructions',
  },
  {
    id: 'claude-dir',
    label: '.claude/',
    section: 'Agent Configs',
    weight: 4,
    paths: ['.claude'],
    type: 'dir',
    description: 'Claude settings, skills, and commands',
  },
  {
    id: 'claude-settings',
    label: '.claude/settings.json',
    section: 'Agent Configs',
    weight: 2,
    paths: ['.claude/settings.json', '.claude/settings.local.json'],
    type: 'file',
    description: 'Claude project settings (permissions, allowed tools)',
  },
  {
    id: 'cursorrules',
    label: '.cursorrules',
    section: 'Agent Configs',
    weight: 6,
    paths: ['.cursorrules'],
    type: 'file',
    description: 'Cursor AI rules file (legacy format)',
  },
  {
    id: 'cursor-rules-dir',
    label: '.cursor/rules/',
    section: 'Agent Configs',
    weight: 8,
    paths: ['.cursor/rules'],
    type: 'dir',
    description: 'Cursor project rules directory (recommended format)',
  },
  {
    id: 'windsurfrules',
    label: '.windsurfrules',
    section: 'Agent Configs',
    weight: 4,
    paths: ['.windsurfrules'],
    type: 'file',
    description: 'Windsurf AI rules file (legacy format)',
  },
  {
    id: 'windsurf-rules-dir',
    label: '.windsurf/rules/',
    section: 'Agent Configs',
    weight: 7,
    paths: ['.windsurf/rules'],
    type: 'dir',
    description: 'Windsurf rules directory — supports always-on, glob, model-decision, and manual activation',
  },
  {
    id: 'windsurf-skills',
    label: '.windsurf/skills/',
    section: 'Agent Configs',
    weight: 4,
    paths: ['.windsurf/skills'],
    type: 'dir',
    description: 'Windsurf workspace-level skills (SKILL.md bundles)',
  },
  {
    id: 'windsurf-workflows',
    label: '.windsurf/workflows/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.windsurf/workflows'],
    type: 'dir',
    description: 'Windsurf workflow sequences invoked via /command',
  },
  {
    id: 'copilot-instructions',
    label: '.github/copilot-instructions.md',
    section: 'Agent Configs',
    weight: 6,
    paths: ['.github/copilot-instructions.md'],
    type: 'file',
    description: 'GitHub Copilot project-level custom instructions',
  },
  {
    id: 'copilot-instructions-dir',
    label: '.github/instructions/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.github/instructions'],
    type: 'dir',
    description: 'Scoped .instructions.md files for Copilot',
  },
  {
    id: 'codex-dir',
    label: '.codex/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.codex'],
    type: 'dir',
    description: 'OpenAI Codex configuration directory',
  },
  {
    id: 'codex-md',
    label: 'CODEX.md',
    section: 'Agent Configs',
    weight: 3,
    paths: ['CODEX.md', 'codex.md'],
    type: 'file',
    description: 'OpenAI Codex instructions file',
  },
  {
    id: 'gemini-dir',
    label: '.gemini/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.gemini'],
    type: 'dir',
    description: 'Google Gemini CLI configuration',
  },
  {
    id: 'aider-conf',
    label: '.aider.conf.yml',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.aider.conf.yml', '.aider.conf.yaml', '.aiderignore'],
    type: 'file',
    description: 'Aider configuration file',
  },
  {
    id: 'roo-dir',
    label: '.roo/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.roo'],
    type: 'dir',
    description: 'Roo Code rules and configuration',
  },
  {
    id: 'continue-config',
    label: '.continue/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.continue', '.continuerc.json'],
    type: 'any',
    description: 'Continue.dev configuration',
  },
  {
    id: 'amp-config',
    label: 'AGENTS.md (Amp)',
    section: 'Agent Configs',
    weight: 0,
    paths: ['ampcode.md', '.amp'],
    type: 'any',
    description: 'Sourcegraph Amp reads AGENTS.md (already counted)',
  },
  {
    id: 'junie-guidelines',
    label: '.junie/ guidelines',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.junie', '.junie/guidelines.md'],
    type: 'any',
    description: 'JetBrains Junie agent guidelines',
  },
  {
    id: 'entire-dir',
    label: '.entire/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.entire'],
    type: 'dir',
    description: 'Entire HQ — captures AI agent sessions per git push',
  },

  // OpenCode
  {
    id: 'opencode-json',
    label: 'opencode.json',
    section: 'Agent Configs',
    weight: 4,
    paths: ['opencode.json'],
    type: 'file',
    description: 'OpenCode project config (model, instructions, MCP servers)',
  },
  {
    id: 'opencode-dir',
    label: '.opencode/',
    section: 'Agent Configs',
    weight: 4,
    paths: ['.opencode'],
    type: 'dir',
    description: 'OpenCode agents, commands, skills, and plugins directory',
  },

  // Zed
  {
    id: 'zed-rules',
    label: '.rules (Zed)',
    section: 'Agent Configs',
    weight: 4,
    paths: ['.rules'],
    type: 'file',
    description: 'Zed editor project-level AI rules file',
  },

  // Trae (ByteDance)
  {
    id: 'trae-rules',
    label: '.trae/rules/',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.trae/rules', '.trae'],
    type: 'any',
    description: 'Trae IDE project rules directory',
  },

  // Cline
  {
    id: 'clinerules',
    label: '.clinerules',
    section: 'Agent Configs',
    weight: 3,
    paths: ['.clinerules'],
    type: 'file',
    description: 'Cline AI assistant project rules file',
  },

  // ── 5. AI IGNORE / CONTEXT FILES ───────────────────────────────────
  {
    id: 'cursorignore',
    label: '.cursorignore',
    section: 'AI Context',
    weight: 3,
    paths: ['.cursorignore'],
    type: 'file',
    description: 'Tells Cursor which files to exclude from indexing',
  },
  {
    id: 'cursorindexingignore',
    label: '.cursorindexingignore',
    section: 'AI Context',
    weight: 2,
    paths: ['.cursorindexingignore'],
    type: 'file',
    description: 'Cursor indexing exclusion list',
  },
  {
    id: 'aiignore',
    label: '.aiignore / .aiexclude',
    section: 'AI Context',
    weight: 2,
    paths: ['.aiignore', '.aiexclude'],
    type: 'file',
    description: 'Generic AI exclusion file',
  },
  {
    id: 'coderabbit',
    label: '.coderabbit.yaml',
    section: 'AI Context',
    weight: 2,
    paths: ['.coderabbit.yaml', '.coderabbit.yml'],
    type: 'file',
    description: 'CodeRabbit AI code review configuration',
  },
  {
    id: 'copilotignore',
    label: '.copilotignore',
    section: 'AI Context',
    weight: 2,
    paths: ['.copilotignore'],
    type: 'file',
    description: 'GitHub Copilot file exclusion list',
  },
  {
    id: 'codeiumignore',
    label: '.codeiumignore',
    section: 'AI Context',
    weight: 2,
    paths: ['.codeiumignore'],
    type: 'file',
    description: 'Windsurf/Codeium global ignore file',
  },
  {
    id: 'vscode-instructions',
    label: '.instructions.md files',
    section: 'AI Context',
    weight: 2,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.instructions.md',
    description: 'VS Code / Copilot scoped instruction files',
  },

  // ── 6. PROMPT TEMPLATES & SKILLS ────────────────────────────────────
  {
    id: 'prompt-yml',
    label: '.prompt.yml files',
    section: 'Prompts & Skills',
    weight: 5,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.prompt.yml',
    description: 'Structured prompt templates for repeatable AI workflows',
  },
  {
    id: 'prompt-md',
    label: '.prompt.md files',
    section: 'Prompts & Skills',
    weight: 3,
    paths: [],
    type: 'deep-scan',
    deepPattern: '.prompt.md',
    description: 'Markdown prompt templates',
  },
  {
    id: 'prompts-dir',
    label: 'prompts/ directory',
    section: 'Prompts & Skills',
    weight: 3,
    paths: ['prompts', '.prompts', '.ai/prompts'],
    type: 'dir',
    description: 'Centralized prompt library directory',
  },
  {
    id: 'skill-md',
    label: 'SKILL.md files',
    section: 'Prompts & Skills',
    weight: 4,
    paths: [],
    type: 'deep-scan',
    deepPattern: 'SKILL.md',
    description: 'Agent skill definitions (progressive disclosure)',
  },
  {
    id: 'claude-commands',
    label: '.claude/commands/',
    section: 'Prompts & Skills',
    weight: 3,
    paths: ['.claude/commands'],
    type: 'dir',
    description: 'Custom Claude slash commands',
  },

  // ── 7. MCP INTEGRATIONS ─────────────────────────────────────────────
  {
    id: 'mcp-json',
    label: '.mcp.json',
    section: 'MCP',
    weight: 6,
    paths: ['.mcp.json', 'mcp.json'],
    type: 'file',
    description: 'MCP server configuration for tool integrations',
  },
  {
    id: 'mcp-json-quality',
    label: 'MCP server count',
    section: 'MCP',
    weight: 3,
    paths: [],
    type: 'custom',
    custom: 'mcp-quality',
    description: 'Multiple MCP servers configured for richer agent capabilities',
  },
  {
    id: 'mcp-dir',
    label: '.mcp/ directory',
    section: 'MCP',
    weight: 2,
    paths: ['.mcp'],
    type: 'dir',
    description: 'MCP server definitions directory',
  },

  // ── 8. AI DEPENDENCIES ──────────────────────────────────────────────
  {
    id: 'ai-deps',
    label: 'AI SDK dependencies',
    section: 'AI Deps',
    weight: 4,
    paths: [],
    type: 'custom',
    custom: 'ai-deps',
    description: 'Project uses AI SDKs (OpenAI, Anthropic, LangChain, etc.)',
  },
];

export const ALL_CHECKS = CHECKS;

// ═══════════════════════════════════════════════════════════════════════
//  DEEP TREE WALKER — single pass, collects all patterns
// ═══════════════════════════════════════════════════════════════════════

function deepScan(rootDir, patterns, maxDepth = 6) {
  const results = {};
  for (const p of patterns) results[p] = [];

  let filesScanned = 0;
  let dirsScanned = 0;

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    dirsScanned++;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);

      if (entry.isFile()) {
        filesScanned++;
        for (const p of patterns) {
          if (entry.name === p || entry.name.endsWith(p)) {
            const rel = relative(rootDir, full);
            // skip root-level matches (those are handled by static checks)
            if (rel.includes('/') || rel.includes('\\')) {
              results[p].push(rel);
            }
          }
        }
      } else if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') || entry.name === '.claude' || entry.name === '.agents') {
          walk(full, depth + 1);
        }
      }
    }
  }

  walk(rootDir, 0);
  return { results, filesScanned, dirsScanned };
}

// ═══════════════════════════════════════════════════════════════════════
//  INTELLIGENT CONTENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════

function readFileSafe(filePath) {
  try { return readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

function lineCount(filePath) {
  try {
    return readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim().length > 0).length;
  } catch { return 0; }
}

function dirItemCount(dirPath) {
  try {
    return readdirSync(dirPath).filter(n => !n.startsWith('.')).length;
  } catch { return 0; }
}

/**
 * Analyze AGENTS.md / CLAUDE.md quality by checking for key sections.
 */
function analyzeAgentsMd(rootDir) {
  const candidates = ['AGENTS.md', 'agents.md', 'CLAUDE.md', 'claude.md'];
  let bestFile = null;
  let bestContent = '';

  for (const f of candidates) {
    const full = join(rootDir, f);
    if (existsSync(full)) {
      const content = readFileSafe(full);
      if (content.length > bestContent.length) {
        bestFile = f;
        bestContent = content;
      }
    }
  }

  if (!bestContent) return { found: false };

  const lower = bestContent.toLowerCase();
  const signals = {
    hasBuildCommands: /\b(build|compile|install|setup)\b/.test(lower) && /\b(run|command|npm|yarn|pnpm|make|cargo|pip|go)\b/.test(lower),
    hasTestInstructions: /\b(test|testing|spec|jest|vitest|pytest|rspec)\b/.test(lower),
    hasStyleGuide: /\b(style|convention|format|lint|naming|pattern)\b/.test(lower),
    hasProjectOverview: /\b(overview|architecture|structure|about|description)\b/.test(lower),
    hasCodeExamples: /```/.test(bestContent),
    hasHeadings: /^#{1,3}\s/m.test(bestContent),
    lineCount: bestContent.split('\n').filter(l => l.trim()).length,
  };

  const score = Object.values(signals).filter(v => v === true).length;
  const quality = score >= 5 ? 'comprehensive' : score >= 3 ? 'good' : score >= 1 ? 'basic' : 'minimal';

  return { found: score >= 3, file: bestFile, signals, quality, score, maxScore: 6 };
}

/**
 * Analyze README quality — does it help agents understand the project?
 */
function analyzeReadmeQuality(rootDir) {
  const candidates = ['README.md', 'readme.md', 'Readme.md'];
  let content = '';

  for (const f of candidates) {
    const full = join(rootDir, f);
    if (existsSync(full)) { content = readFileSafe(full); break; }
  }

  if (!content) return { found: false };

  const lower = content.toLowerCase();
  const signals = {
    hasInstallation: /\b(install|setup|getting.started|quick.start)\b/.test(lower),
    hasUsage: /\b(usage|how.to.use|example|demo)\b/.test(lower),
    hasStructure: /\b(structure|directory|folder|layout|architecture)\b/.test(lower),
    hasCodeBlocks: /```/.test(content),
    hasHeadings: (content.match(/^#{1,3}\s/gm) || []).length >= 3,
    isSubstantial: content.split('\n').filter(l => l.trim()).length >= 20,
  };

  const score = Object.values(signals).filter(v => v === true).length;
  const detail = score >= 4 ? 'rich' : score >= 2 ? 'adequate' : 'sparse';

  return { found: score >= 3, signals, detail, score, maxScore: 6 };
}

/**
 * Detect AI-related dependencies in package.json or requirements.txt.
 */
function detectAiDeps(rootDir) {
  const found = [];

  // package.json
  const pkgPath = join(rootDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSafe(pkgPath));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const dep of Object.keys(allDeps)) {
        if (AI_PACKAGES.has(dep)) found.push(dep);
      }
    } catch { /* ignore */ }
  }

  // requirements.txt / pyproject.toml
  for (const reqFile of ['requirements.txt', 'pyproject.toml']) {
    const reqPath = join(rootDir, reqFile);
    if (existsSync(reqPath)) {
      const content = readFileSafe(reqPath).toLowerCase();
      for (const pkg of AI_PY_PACKAGES) {
        if (content.includes(pkg)) found.push(pkg);
      }
    }
  }

  return found;
}

/**
 * Detect standard scripts in package.json / Makefile.
 */
function detectScripts(rootDir) {
  const found = [];
  const missing = [];
  const desired = ['start', 'test', 'lint'];

  const pkgPath = join(rootDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSafe(pkgPath));
      const scripts = pkg.scripts || {};
      for (const s of desired) {
        if (scripts[s]) found.push(`npm run ${s}`);
        else missing.push(s);
      }
    } catch { /* ignore */ }
  }

  const makefilePath = join(rootDir, 'Makefile');
  if (existsSync(makefilePath)) {
    try {
      const content = readFileSafe(makefilePath);
      for (const s of desired) {
        if (content.includes(`${s}:`)) {
          if (!found.some(f => f.includes(s))) found.push(`make ${s}`);
          const idx = missing.indexOf(s);
          if (idx !== -1) missing.splice(idx, 1);
        }
      }
    } catch { /* ignore */ }
  }

  return { found, missing };
}

/**
 * Analyze MCP config quality — how many servers are configured?
 */
function analyzeMcpConfig(rootDir) {
  for (const f of ['.mcp.json', 'mcp.json']) {
    const full = join(rootDir, f);
    if (existsSync(full)) {
      try {
        const config = JSON.parse(readFileSafe(full));
        const servers = config.mcpServers || config.servers || config;
        const count = typeof servers === 'object' ? Object.keys(servers).length : 0;
        return { found: count >= 2, count, names: Object.keys(servers).slice(0, 8) };
      } catch { return { found: false }; }
    }
  }
  return { found: false };
}

function existsAny(fullPath) {
  if (!existsSync(fullPath)) return null;
  const stat = statSync(fullPath);
  return stat.isFile() ? 'file' : stat.isDirectory() ? 'dir' : null;
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN SCAN — with progress callback
// ═══════════════════════════════════════════════════════════════════════

export async function scan(rootDir, onProgress) {
  const emit = onProgress || (() => {});
  const findings = [];

  // ── Phase 1: Deep tree scan (single pass) ───────────────
  emit({ phase: 'deep-scan', message: 'Deep scanning file tree…' });

  const deepPatterns = CHECKS
    .filter(c => c.type === 'deep-scan')
    .map(c => c.deepPattern);

  const { results: deepResults, filesScanned, dirsScanned } = deepScan(rootDir, deepPatterns);

  emit({ phase: 'deep-scan-done', filesScanned, dirsScanned });

  // ── Phase 2: Static checks + intelligent analysis ───────
  const totalChecks = CHECKS.length;
  let checked = 0;

  for (const check of CHECKS) {
    checked++;
    emit({ phase: 'checking', current: checked, total: totalChecks, label: check.label });

    // ── Deep-scan results ─────────────────────────────────
    if (check.type === 'deep-scan') {
      const matches = deepResults[check.deepPattern] || [];
      findings.push({
        ...check,
        found: matches.length > 0,
        matches,
        detail: matches.length > 0 ? `${matches.length} file(s) found` : null,
      });
      continue;
    }

    // ── Custom: scripts ───────────────────────────────────
    if (check.type === 'custom' && check.custom === 'scripts') {
      const scripts = detectScripts(rootDir);
      const ok = scripts.found.length >= 2;
      findings.push({
        ...check, found: ok, matches: scripts.found,
        detail: ok
          ? `${scripts.found.length}/3 (${scripts.found.join(', ')})`
          : scripts.found.length > 0
            ? `${scripts.found.length}/3 — missing: ${scripts.missing.join(', ')}`
            : null,
      });
      continue;
    }

    // ── Custom: AGENTS.md quality ─────────────────────────
    if (check.type === 'custom' && check.custom === 'agents-md-quality') {
      const analysis = analyzeAgentsMd(rootDir);
      findings.push({
        ...check,
        found: analysis.found,
        detail: analysis.found
          ? `${analysis.quality} (${analysis.score}/${analysis.maxScore} signals in ${analysis.file})`
          : null,
        analysis,
      });
      continue;
    }

    // ── Custom: README quality ────────────────────────────
    if (check.type === 'custom' && check.custom === 'readme-quality') {
      const analysis = analyzeReadmeQuality(rootDir);
      findings.push({
        ...check,
        found: analysis.found,
        detail: analysis.found ? `${analysis.detail} (${analysis.score}/${analysis.maxScore} signals)` : null,
        analysis,
      });
      continue;
    }

    // ── Custom: AI deps ───────────────────────────────────
    if (check.type === 'custom' && check.custom === 'ai-deps') {
      const deps = detectAiDeps(rootDir);
      findings.push({
        ...check,
        found: deps.length > 0,
        matches: deps,
        detail: deps.length > 0 ? deps.join(', ') : null,
      });
      continue;
    }

    // ── Custom: MCP quality ───────────────────────────────
    if (check.type === 'custom' && check.custom === 'mcp-quality') {
      const mcp = analyzeMcpConfig(rootDir);
      findings.push({
        ...check,
        found: mcp.found,
        detail: mcp.found ? `${mcp.count} server(s): ${mcp.names.join(', ')}` : null,
      });
      continue;
    }

    // ── "any" type ────────────────────────────────────────
    if (check.type === 'any') {
      let matched = null;
      let detail = null;
      for (const p of check.paths) {
        const full = join(rootDir, p);
        const kind = existsAny(full);
        if (kind) {
          matched = p;
          detail = kind === 'file' ? `${lineCount(full)} line(s)` : `${dirItemCount(full)} item(s)`;
          break;
        }
      }
      findings.push({ ...check, found: !!matched, matchedPath: matched, detail });
      continue;
    }

    // ── Standard file / dir probe ─────────────────────────
    let matched = null;
    let detail = null;
    for (const p of check.paths) {
      const full = join(rootDir, p);
      if (existsSync(full)) {
        matched = p;
        const stat = statSync(full);
        if (stat.isFile()) detail = `${lineCount(full)} line(s)`;
        else if (stat.isDirectory()) detail = `${dirItemCount(full)} item(s)`;
        break;
      }
    }

    findings.push({ ...check, found: !!matched, matchedPath: matched, detail });
  }

  emit({ phase: 'done', total: totalChecks });
  return findings;
}
