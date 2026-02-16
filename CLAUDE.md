# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`check-ai` is a zero-dependency CLI tool that audits repositories for AI-readiness. It runs 66 checks across 8 sections (Repo Hygiene, Grounding Docs, Testing, Agent Configs, AI Context, Prompts & Skills, MCP, AI Deps) and produces a 0-10 score with letter grades.

The tool is designed to be run via `npx check-ai` and works entirely offline using Node.js built-ins.

## Commands

### Development

```bash
# Run tests (Node.js native test runner)
npm test

# Run linting
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Run the CLI locally
node bin/cli.mjs
node bin/cli.mjs /path/to/repo
node bin/cli.mjs --json
node bin/cli.mjs --verbose
node bin/cli.mjs badge
```

### Testing

The test suite uses Node.js native test runner (`node:test`). Tests are in `tests/*.test.mjs`:
- `audits.test.mjs` - Tests for individual audit modules
- `cli.test.mjs` - CLI argument parsing and integration tests
- `scanner.test.mjs` - Scanner logic and deep scan tests
- `scorer.test.mjs` - Scoring and grading logic tests

Test fixtures are dynamically created in `tests/.fixtures/` during test runs.

## Architecture

### Core Components

**`bin/cli.mjs`** - Entry point. Handles argument parsing, determines interactive vs static output mode, coordinates scan → score → report flow. Exits with code 1 if score < 3 (for CI integration).

**`src/scanner.mjs`** - The scanning engine:
- Dynamically loads all audit modules from `src/audits/*.mjs`
- Performs a single-pass deep tree walk (up to 6 levels) to collect files matching deep-scan patterns
- Evaluates each check: file/dir existence, deep-scan matches, or custom handlers
- Returns raw findings array with `found`, `matches`, `detail` for each check

**`src/scorer.mjs`** - Converts findings into scores:
- Sums `weight` values from passed checks
- Normalizes to 0-10 scale
- Assigns letter grade (A+, A, B, C, D, F) based on score thresholds
- Groups findings by section in a fixed order

**`src/reporter.mjs`** - Output formatting:
- `reportInteractive()` - Animated TTY output with spinners, staggered reveals, progress bars
- `report()` - Static text output for pipes/CI
- `reportJson()` - Machine-readable JSON output
- Uses only ANSI escape codes, no external dependencies

### Audit System

All checks are defined in modular files under `src/audits/`:
- `agent-configs.mjs` - AI tool configurations (Cursor, Windsurf, Claude, Copilot, etc.)
- `grounding-docs.mjs` - Documentation files (README, ARCHITECTURE, CONTRIBUTING, llms.txt, etc.)
- `repo-hygiene.mjs` - Standard repo files (gitignore, CI configs, linters, formatters, etc.)
- `testing.mjs` - Test directories and runner configurations
- `ai-context.mjs` - AI ignore files (.aiignore, .cursorignore, etc.)
- `prompts-skills.mjs` - Prompt templates and skill definitions
- `mcp.mjs` - Model Context Protocol integrations
- `ai-deps.mjs` - AI SDK dependencies in package.json/requirements.txt

Each audit module exports:
- `section` - Section name (e.g., "Agent Configs")
- `checks[]` - Array of check definitions with:
  - `id`, `label`, `section`, `weight`, `description`
  - `type` - "file", "dir", "any", "deep-scan", or "custom"
  - `paths[]` - Candidate file/dir paths to check
  - `deepPattern` - For deep-scan checks (e.g., "AGENTS.md")
  - `custom` - Handler name for custom logic
- `analyze(rootDir, ctx)` - Optional function returning custom check results

The scanner passes a `ctx` object to `analyze()` with utilities: `existsSync`, `readFileSafe`, `lineCount`, `dirItemCount`, etc.

### Check Types

- **file/dir** - Checks if any path in `paths[]` exists
- **any** - Like file/dir but accepts either files or directories
- **deep-scan** - Single-pass tree walk to find nested files matching `deepPattern`
- **custom** - Arbitrary logic implemented in the audit's `analyze()` function

### Key Patterns

1. **Dynamic audit loading** - `scanner.mjs` imports all `.mjs` files from `src/audits/` at runtime, so adding a new audit category requires no changes to core code.

2. **Single-pass deep scan** - All deep-scan patterns are collected and executed in one tree walk to avoid O(n²) directory traversals.

3. **Zero dependencies** - Uses only Node.js built-ins (`fs`, `path`, `readline`). No network calls. Works offline.

4. **Progressive disclosure** - Interactive mode shows checks as they run with spinners; static mode shows all at once.

5. **CI-friendly** - Auto-detects pipes/CI environments, disables animations, exits non-zero on poor scores.

## Scoring Philosophy

- **"At least one AI tool configured"** check has weight 20 (highest bonus) - having Cursor OR Windsurf OR Claude is enough
- **AGENTS.md** has weight 10 - it's the universal cross-tool standard
- **Content quality checks** - AGENTS.md and README.md are analyzed for signals like build commands, test instructions, code examples
- **Weighted scoring** - Each check has a weight (1-20). Raw score is normalized to 0-10 scale.

## Code Style

- ES modules (`.mjs` extension)
- Minimal abstraction - direct, procedural code over unnecessary helpers
- Descriptive variable names
- Section separators using comments: `// ─── Section name ───`
- No external dependencies allowed
- All file I/O wrapped in try/catch (return empty/null on errors)
