# AGENTS.md

## Project Overview

**check-ai** is a zero-dependency Node.js CLI tool that audits any repository for AI-readiness. It runs 66+ checks across 8 sections, scores results on a 0–10 scale, and outputs an interactive terminal report or machine-readable JSON.

```
npx check-ai [directory] [options]
```

## Tech Stack

- **Runtime**: Node.js (ESM modules, `"type": "module"`)
- **Dependencies**: Zero — only Node.js built-ins (`fs`, `path`, `readline`, `url`)
- **Language**: JavaScript (.mjs)
- **Package manager**: npm

## Project Structure

```
check-ai/
├── bin/
│   └── cli.mjs              # CLI entry point — arg parsing, spinner, orchestration
├── src/
│   ├── scanner.mjs           # Dynamic audit loader, deep tree walker, main scan()
│   ├── scorer.mjs            # Score normalization (0–10), letter grades, section ordering
│   ├── reporter.mjs          # Terminal output — interactive (animated) and static modes
│   └── audits/               # ⭐ Modular audit files — auto-loaded at scan time
│       ├── repo-hygiene.mjs  # 🧹 Git, linter, formatter, CI, scripts, devcontainer
│       ├── grounding-docs.mjs# 📄 README, architecture, tech-stack, llms.txt
│       ├── testing.mjs       # 🧪 Test dirs, runner configs, coverage
│       ├── agent-configs.mjs # 🤖 30 checks for AI tools (Claude, Cursor, Windsurf, etc.)
│       ├── ai-context.mjs    # 🔒 Ignore files (.cursorignore, .aiignore, etc.)
│       ├── prompts-skills.mjs# 🧩 .prompt.yml, SKILL.md, claude commands
│       ├── mcp.mjs           # 🔌 MCP config and server count
│       └── ai-deps.mjs       # 📦 AI SDK detection in package.json / requirements.txt
├── package.json
└── README.md
```

## Architecture

### Data Flow

```
cli.mjs → scanner.scan(rootDir) → scorer.score(findings) → reporter.report(result)
```

1. **Scanner** dynamically imports all `.mjs` files from `src/audits/`, collects checks, runs a single-pass deep tree walk, evaluates each check, and returns a `findings[]` array.
2. **Scorer** takes findings, computes weighted points, normalizes to 0–10, assigns a letter grade (A+ through F), and groups by section.
3. **Reporter** renders the output — interactive mode with spinner + animated bars, or static plaintext, or JSON.

### Audit Module System

Each file in `src/audits/` is auto-discovered and must export:

```js
export const section = 'Section Name';   // report section header
export const checks = [ ... ];           // array of check definitions
// optional:
export function analyze(rootDir, ctx) {  // handles custom check types
  return { 'custom-key': { found: true, detail: '...' } };
}
```

**Check types**: `file`, `dir`, `any`, `deep-scan` (tree walk), `custom` (via `analyze()`).

The `ctx` object passed to `analyze()` provides: `existsSync`, `statSync`, `readFileSync`, `readFileSafe`, `readdirSync`, `join`, `relative`, `lineCount`, `dirItemCount`.

### Key Constants

- **`SKIP_DIRS`** in `scanner.mjs` — directories excluded from deep scans (node_modules, .git, dist, etc.)
- **`SECTION_ORDER`** in `scorer.mjs` — controls report section ordering
- **`SECTION_ICONS`** in `reporter.mjs` — emoji icons per section

## Build & Run Commands

```bash
# Run against current directory
node bin/cli.mjs

# Run against a specific repo
node bin/cli.mjs /path/to/repo

# Non-interactive output (CI-friendly)
node bin/cli.mjs --no-interactive .

# JSON output
node bin/cli.mjs --json .

# Verbose (include low-priority recommendations)
node bin/cli.mjs --verbose .
```

No build step required — pure ESM JavaScript, runs directly with Node.js.

## Testing

No formal test suite yet. Verify changes manually:

```bash
# Quick smoke test — static output
node bin/cli.mjs --no-interactive . 2>&1 | tail -20

# Verify check count and score
node bin/cli.mjs --json . 2>&1 | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('checks:', d.checks.total, 'score:', d.score)"

# Test against another repo
node bin/cli.mjs --no-interactive /path/to/other-repo
```

## Code Style & Conventions

- **ESM only** — all files use `import`/`export`, file extension `.mjs`
- **No external dependencies** — everything uses Node.js built-ins
- **No network calls** — all checking is offline, static file analysis
- **Functional style** — scanner exports `scan()`, scorer exports `score()`, reporter exports `report()` / `reportInteractive()` / `reportJson()`
- **ANSI codes** — reporter uses raw escape codes (no chalk/picocolors)
- **Single-pass tree walk** — deep scan collects all patterns in one walk for performance

## Adding a New Audit

1. Create `src/audits/{name}.mjs` with `section`, `checks[]`, and optional `analyze()`
2. Add the section name to `SECTION_ORDER` in `src/scorer.mjs`
3. Add a section icon to `SECTION_ICONS` in `src/reporter.mjs`
4. Run `node bin/cli.mjs --no-interactive .` to verify

Check IDs must be unique across all audit files. See `.windsurf/skills/create-audit/SKILL.md` for the full guide.

## Scoring Philosophy

- Weighted checks: each check has a `weight` (1–20) based on real-world impact
- **Big bonus (weight 20)** for having any one AI tool configured — users pick one tool, not all
- **AGENTS.md weighted highest** (weight 10) among individual checks — it's the universal standard
- Content quality analysis for AGENTS.md and README.md (regex heuristics, not LLM)
- Score normalized to 0–10, exits with code 1 if below 3 (CI gate)

## Important Constraints

- **Zero dependencies** — do not add any npm packages
- **Offline only** — no fetch, no network calls, no API keys
- **Node.js built-ins only** — fs, path, readline, url, etc.
- **ESM modules** — no CommonJS require()
- **No build step** — runs directly via `node bin/cli.mjs`
