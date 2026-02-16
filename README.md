<p align="center">
  <img src="logo.svg" alt="check-ai logo" width="120" height="120">
</p>

<h1 align="center">npx check-ai</h1>

<p align="center"><strong>Audit any repository for AI-readiness.</strong></p>

<p align="center">

[![AI Ready](https://img.shields.io/badge/AI%20Ready-C%204.9%2F10-yellow)](https://github.com/f/check-ai)

</p>

One command. 66 checks. Zero dependencies. Scans for agent configs, repo hygiene, grounding docs, testing safety nets, prompt templates, MCP integrations, AI dependencies — and scores it all on a **0–10 scale**.

```
  🧹 Repo Hygiene  ████████████░░░  77% (26/34)
  📄 Grounding Docs ██████████░░░░░  65% (15/23)
  🧪 Testing       ██████████████░  90% (9/10)
  🤖 Agent Configs  ████████████░░░  75% (55/73)
  🔒 AI Context    ██████░░░░░░░░░  40% (6/15)
  🧩 Prompts       ████░░░░░░░░░░░  28% (5/18)
  🔌 MCP           ███████████████  100% (11/11)
  📦 AI Deps       ███████████████  100% (4/4)

  ──────────────────────────────────────────────────

   A   Strong — AI-ready

  ████████████████████████████████░░░░░░░░  7.8/10
  38 of 66 checks passed · 131/188 pts

  ──────────────────────────────────────────────────
```

## Install & Run

```bash
npx check-ai
```

Scan a specific repo:

```bash
npx check-ai /path/to/repo
```

### Options

| Flag               | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `--json`           | Machine-readable JSON output                          |
| `--verbose`, `-v`  | Include low-priority (nice-to-have) recommendations   |
| `--no-interactive` | Disable animated output (auto-detected in CI / pipes) |
| `--ci`             | Alias for `--no-interactive`                          |
| `-h`, `--help`     | Show help                                             |
| `--version`        | Show version                                          |

### CI Integration

`check-ai` exits with code **1** when the score is below 3/10, so you can use it as a CI gate:

```yaml
# GitHub Actions
- name: AI Readiness Check
  run: npx check-ai
```

```yaml
# GitLab CI
ai-audit:
  script: npx check-ai --ci
```

### JSON Output

Pipe results into other tools or dashboards:

```bash
npx check-ai --json | jq '.score'
```

```json
{
  "score": 7.8,
  "grade": "A",
  "label": "Strong — AI-ready",
  "checks": { "passed": 38, "total": 66 },
  "sections": { ... },
  "findings": [ ... ]
}
```

---

## What It Audits

`check-ai` runs **66 checks** grouped into **8 sections**. Each check has a weight based on real-world impact.

### 🧹 Repo Hygiene

A clean, well-structured repo is the foundation for AI agents to work effectively.

| Check            | What it looks for                                                         |
| ---------------- | ------------------------------------------------------------------------- |
| Git repo         | `.git` directory                                                          |
| Gitignore        | `.gitignore`                                                              |
| Env example      | `.env.example`, `.env.sample`, `.env.template`                            |
| Editor config    | `.editorconfig`                                                           |
| Linter           | ESLint, Pylint, Ruff, RuboCop, golangci-lint configs                      |
| Formatter        | Prettier, Biome, deno fmt, clang-format, rustfmt configs                  |
| CI pipeline      | GitHub Actions, GitLab CI, CircleCI, Jenkins, Travis, Bitbucket Pipelines |
| Standard scripts | `start`, `test`, `lint` in package.json or Makefile                       |
| Dev container    | `.devcontainer/` for reproducible environments                            |

### 📄 Grounding Docs

Documentation that helps AI agents understand what your project is and how it works.

| Check              | What it looks for                                                          |
| ------------------ | -------------------------------------------------------------------------- |
| README             | `README.md`                                                                |
| README quality     | Checks for install instructions, usage, structure, code blocks, headings   |
| Contributing guide | `CONTRIBUTING.md`                                                          |
| Architecture doc   | `architecture.md`, `ARCHITECTURE.md`, `docs/architecture.md`               |
| Tech stack doc     | `tech-stack.md`, `docs/tech-stack.md`                                      |
| AI requirements    | `.ai/requirements`, `.ai/docs`, `docs/prd`                                 |
| llms.txt           | `llms.txt`, `llms-full.txt` (the [llms.txt standard](https://llmstxt.org)) |

### 🧪 Testing Safety Net

Tests catch agent-introduced regressions before they ship.

| Check              | What it looks for                                                           |
| ------------------ | --------------------------------------------------------------------------- |
| Test directory     | `tests/`, `test/`, `__tests__/`, `spec/`, `e2e/`, `cypress/`, `playwright/` |
| Test runner config | Jest, Vitest, Playwright, Cypress, pytest, RSpec configs                    |
| Coverage config    | nyc, c8, coveragerc, Codecov configs                                        |

### 🤖 Agent Configs

The core of AI-readiness. Having **at least one** AI tool configured earns a large bonus — because in practice, teams use one tool (Cursor **or** Windsurf **or** Claude Code), not all of them at once.

| Check                    | What it looks for                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| **At least one AI tool** | Any tool-specific config found (big bonus)                                                       |
| AGENTS.md                | Universal cross-tool agent instructions ([agents.md](https://agents.md))                         |
| AGENTS.md quality        | Content analysis: build commands, test instructions, style guide, code examples                  |
| Nested AGENTS.md         | Deep scan for per-module AGENTS.md files                                                         |
| .agents/                 | Agent assets directory (skills, plans)                                                           |
| Claude Code              | `CLAUDE.md`, `.claude/`, `.claude/settings.json`                                                 |
| Cursor                   | `.cursorrules`, `.cursor/rules/`                                                                 |
| Windsurf                 | `.windsurfrules` (legacy), `.windsurf/rules/` (new), `.windsurf/skills/`, `.windsurf/workflows/` |
| GitHub Copilot           | `.github/copilot-instructions.md`, `.github/instructions/`                                       |
| OpenAI Codex             | `.codex/`, `CODEX.md`                                                                            |
| Google Gemini            | `.gemini/`                                                                                       |
| Aider                    | `.aider.conf.yml`                                                                                |
| Roo Code                 | `.roo/`                                                                                          |
| Continue                 | `.continue/`, `.continuerc.json`                                                                 |
| Amp (Sourcegraph)        | Reads AGENTS.md (counted via AGENTS.md check)                                                    |
| JetBrains Junie          | `.junie/`, `.junie/guidelines.md`                                                                |
| Entire HQ                | `.entire/` (captures AI agent sessions per git push)                                             |
| OpenCode                 | `opencode.json`, `.opencode/` (agents, commands, skills, plugins)                                |
| Zed                      | `.rules`                                                                                         |
| Trae                     | `.trae/rules/`                                                                                   |
| Cline                    | `.clinerules`                                                                                    |

### 🔒 AI Context

Files that control what AI agents can and cannot see.

| Check                  | What it looks for                      |
| ---------------------- | -------------------------------------- |
| Cursor ignore          | `.cursorignore`                        |
| Cursor indexing ignore | `.cursorindexingignore`                |
| AI ignore              | `.aiignore`, `.aiexclude`              |
| CodeRabbit             | `.coderabbit.yaml`                     |
| Copilot ignore         | `.copilotignore`                       |
| Codeium ignore         | `.codeiumignore`                       |
| Instruction files      | Deep scan for `.instructions.md` files |

### 🧩 Prompts & Skills

Reusable prompt templates and agent skill definitions.

| Check                   | What it looks for                       |
| ----------------------- | --------------------------------------- |
| Prompt templates (.yml) | Deep scan for `.prompt.yml` files       |
| Prompt templates (.md)  | Deep scan for `.prompt.md` files        |
| Prompts directory       | `prompts/`, `.prompts/`, `.ai/prompts/` |
| Skills                  | Deep scan for `SKILL.md` files          |
| Claude commands         | `.claude/commands/`                     |

### 🔌 MCP (Model Context Protocol)

Tool integrations that extend agent capabilities.

| Check            | What it looks for                           |
| ---------------- | ------------------------------------------- |
| MCP config       | `.mcp.json`, `mcp.json`                     |
| MCP server count | Parses config and counts configured servers |
| MCP directory    | `.mcp/`                                     |

### 📦 AI Dependencies

Detects AI SDK usage in your project.

| Check   | What it looks for                                                                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI SDKs | Scans `package.json`, `requirements.txt`, `pyproject.toml` for OpenAI, Anthropic, LangChain, Vercel AI SDK, Google AI, Hugging Face, MCP SDK, vector DBs, tokenizers, and more (~40 packages) |

---

## How Scoring Works

Each check has a **weight** based on how much it impacts AI-readiness.

The raw score is normalized to a **0–10 scale**:

| Grade  | Score | Verdict                     |
| ------ | ----- | --------------------------- |
| **A+** | 9–10  | Exemplary — fully AI-ready  |
| **A**  | 7–9   | Strong — AI-ready           |
| **B**  | 5–7   | Decent — partially AI-ready |
| **C**  | 3–5   | Weak — minimal AI setup     |
| **D**  | 1–3   | Poor — barely AI-aware      |
| **F**  | 0–1   | None — not AI-ready         |

### Scoring Philosophy

- **Having any one AI tool configured earns a big bonus.** People use Cursor or Windsurf or Claude Code — not all at once. The tool doesn't penalize you for picking one.
- **AGENTS.md is weighted highest** among individual checks because it's the universal, cross-tool standard.
- **Content quality matters**, not just file existence. AGENTS.md and README.md are analyzed for real signals like build commands, test instructions, code examples, and headings.
- **Deep scanning** walks your file tree (up to 6 levels) to find nested AGENTS.md, .prompt.yml, SKILL.md, and .instructions.md files.

---

## Interactive Mode

When run in a terminal (TTY), `check-ai` shows:

- **Spinner** with live progress during scanning
- **Animated score bar** that fills in real-time
- **Section-by-section reveal** with staggered items

Automatically falls back to static output when piped or in CI environments.

---

## Zero Dependencies

Built entirely with Node.js built-ins (`fs`, `path`, `readline`). No install required beyond `npx`. Works offline — no network calls, pure static analysis.

## License

MIT
