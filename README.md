# check-ai

Audit any repository for AI-readiness. Checks agent configs, repo hygiene, grounding docs, testing safety nets, MCP integrations — and scores it all on a 0–10 scale.

```
  ──────────────────────────────────────────────────
   A   Strong — AI-ready
  ████████████████████████████░░░░░░░░░░░░  7.2/10
  28 of 42 checks passed · 142/197 pts
  ──────────────────────────────────────────────────
```

## Usage

```bash
npx check-ai
```

```bash
npx check-ai /path/to/repo
```

### Options

```
--json       Machine-readable JSON output
--verbose    Include low-priority recommendations
-h, --help   Show help
--version    Show version
```

### CI integration

`check-ai` exits with code **1** when the score is below 3/10, making it usable as a CI gate:

```yaml
- name: AI Readiness Check
  run: npx check-ai
```

## What it audits

### 🧹 Repo Hygiene
`.git`, `.gitignore`, `.env.example`, `.editorconfig`, linter config, formatter config, CI pipeline, standard scripts (`start` / `test` / `lint`)

### 📄 Grounding Docs
`README.md`, `CONTRIBUTING.md`, `architecture.md`, `tech-stack.md`, `.ai/requirements`, `llms.txt`

### 🧪 Testing Safety Net
Test directories, test runner configs (Jest, Vitest, Playwright, Cypress, pytest…), coverage configs

### 🤖 Agent Configs
`AGENTS.md` (root + nested), `.agents/`, `.agents/skills/`, `CLAUDE.md`, `.claude/`, `.cursorrules`, `.cursor/rules/`, `.windsurfrules`, `.windsurf/`, `.github/copilot-instructions.md`, `.github/instructions/`, `.codex/`, `CODEX.md`, `.gemini/`, `.aider.conf.yml`, `.roo/`, `.continue/`, `.junie/`

### 🔒 AI Context
`.cursorignore`, `.cursorindexingignore`, `.aiignore`, `.coderabbit.yaml`, `.copilotignore`, `.instructions.md` files

### 🔌 MCP
`.mcp.json`, `.mcp/`

## Scoring

Each signal has a weight based on impact. The total is normalized to a **0–10 scale**:

| Grade | Score | Verdict |
|-------|-------|---------|
| **A+** | 9–10 | Exemplary — fully AI-ready |
| **A** | 7–9 | Strong — AI-ready |
| **B** | 5–7 | Decent — partially AI-ready |
| **C** | 3–5 | Weak — minimal AI setup |
| **D** | 1–3 | Poor — barely AI-aware |
| **F** | 0–1 | None — not AI-ready |

## Zero dependencies

Built entirely with Node.js built-ins. No install required beyond `npx`.

## License

MIT
