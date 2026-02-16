# Contributing to check-ai

Thanks for your interest in improving check-ai! This guide will help you get started.

## Quick Start

```bash
git clone <repo-url>
cd check-ai
node bin/cli.mjs --no-interactive .
npm test
```

No install step needed — zero dependencies, pure Node.js.

## Adding a New Audit

The easiest and most impactful way to contribute is by adding new audit checks. Each audit is a single `.mjs` file in `src/audits/` that gets auto-loaded by the scanner.

### Use the Skill

We have a **Windsurf skill** that guides you through creating audits step by step:

```
.windsurf/skills/create-audit/SKILL.md
```

If you're using Windsurf, the skill activates automatically when you ask to create an audit. It covers:

- The audit file contract (`section`, `checks[]`, `analyze()`)
- All 5 check types (`file`, `dir`, `any`, `deep-scan`, `custom`)
- Weight guidelines and scoring impact
- Working examples (simple, custom analysis, deep-scan)
- A complete reference example in `references/mcp-audit-example.mjs`

Even if you're not using Windsurf, reading the SKILL.md is the fastest way to understand the audit module system.

### Manual Steps

1. Create `src/audits/{name}.mjs`
2. Export `section` (string), `checks` (array), and optionally `analyze()` (function)
3. Add the section name to `SECTION_ORDER` in `src/scorer.mjs`
4. Add an emoji icon to `SECTION_ICONS` in `src/reporter.mjs`
5. Run `node bin/cli.mjs --no-interactive .` to verify
6. Run `npm test` to ensure all tests pass

## Project Structure

```
bin/cli.mjs          # CLI entry point
src/scanner.mjs      # Dynamic audit loader + deep tree walker
src/scorer.mjs       # Score normalization (0–10)
src/reporter.mjs     # Terminal output (interactive + static + JSON)
src/audits/          # ⭐ Modular audit files — one per section
tests/               # Tests (node:test)
```

See `AGENTS.md` for full architecture details, data flow, and conventions.

## Code Style

- **ESM only** — `import`/`export`, `.mjs` extension
- **Zero dependencies** — Node.js built-ins only (`fs`, `path`, `readline`, `url`)
- **No network calls** — all checking is offline, static file analysis
- **No build step** — runs directly with `node`

## Running Tests

```bash
npm test
```

Tests use Node.js built-in `node:test` and `node:assert`. They cover audit module structure, scorer logic, scanner evaluation, and CLI integration.

## Guidelines

- **Check IDs must be unique** across all audit files
- **One section per file** — keep audits focused on a single concern
- **Weight range 1–20** — see the skill for guidelines on choosing weights
- **Offline only** — no fetch, no API keys, no network calls
- Keep the tool fast — the single-pass deep scan is intentional for performance

## Reporting Issues

When reporting a bug, include:

- The command you ran
- The output (use `--no-interactive` for copy-pastable output)
- Your Node.js version (`node -v`)
- The repo you scanned (if public) or a minimal reproduction

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
