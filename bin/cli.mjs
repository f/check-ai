#!/usr/bin/env node

import { scan } from '../src/scanner.mjs';
import { score, scoreAllTools } from '../src/scorer.mjs';
import { report, reportInteractive, reportJson, reportTools, reportToolsInteractive, reportToolsJson, createSpinner } from '../src/reporter.mjs';
import { resolve, basename } from 'path';

// ── Parse args ────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {
  json: false,
  verbose: false,
  help: false,
  version: false,
  noInteractive: false,
  badge: false,
  tools: false,
};
let targetPath = '.';

for (const arg of args) {
  if (arg === '--json') flags.json = true;
  else if (arg === '--verbose' || arg === '-v') flags.verbose = true;
  else if (arg === '--help' || arg === '-h') flags.help = true;
  else if (arg === '--version') flags.version = true;
  else if (arg === '--no-interactive' || arg === '--ci') flags.noInteractive = true;
  else if (arg === 'badge') flags.badge = true;
  else if (arg === '--tools' || arg === '-t') flags.tools = true;
  else if (!arg.startsWith('-')) targetPath = arg;
}

// Auto-detect: disable interactive when piped or in CI
const isTTY = process.stdout.isTTY && !process.env.CI;
const interactive = isTTY && !flags.json && !flags.noInteractive && !flags.badge;

// ── Help ──────────────────────────────────────────────────
if (flags.help) {
  console.log(`
  check-ai — Audit any repo for AI-readiness

  Usage
    $ check-ai [directory] [options]

  Commands
    badge              Generate a shields.io badge in Markdown

  Options
    --json             Output results as JSON
    --tools, -t        Show per-tool readiness scores
    --verbose, -v      Show all recommendations (including low-priority)
    --no-interactive   Disable animated output (auto-detected in CI / pipes)
    --ci               Alias for --no-interactive
    -h, --help         Show this help message
    --version          Show version

  Examples
    $ check-ai                  # audit current directory
    $ check-ai ./my-project     # audit a specific repo
    $ check-ai --json           # machine-readable output
    $ check-ai --tools          # show per-tool breakdown
    $ check-ai . --verbose      # include nice-to-have suggestions
    $ check-ai badge            # output a Markdown badge
`);
  process.exit(0);
}

// ── Version ───────────────────────────────────────────────
if (flags.version) {
  const { readFileSync } = await import('fs');
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  console.log(pkg.version);
  process.exit(0);
}

// ── Run audit ─────────────────────────────────────────────
const targetDir = resolve(targetPath);
const repoName = basename(targetDir);

let spinner = null;

if (interactive) {
  console.log('');
  spinner = createSpinner();
  spinner.start(`Auditing ${repoName} …`);
} else if (!flags.json && !flags.badge) {
  console.log('');
  console.log(`  [SEARCH] Auditing ${repoName} …`);
}

// Progress callback for interactive mode
const onProgress = interactive
  ? (ev) => {
      if (ev.phase === 'deep-scan') {
        spinner.update('Deep scanning file tree …');
      } else if (ev.phase === 'deep-scan-done') {
        spinner.update(
          `Scanned ${ev.filesScanned.toLocaleString()} files in ${ev.dirsScanned.toLocaleString()} dirs — analyzing …`,
        );
      } else if (ev.phase === 'checking') {
        spinner.update(`Checking ${ev.current}/${ev.total}: ${ev.label}`);
      } else if (ev.phase === 'done') {
        spinner.stop(`Scanned ${repoName} — ${ev.total} checks complete`);
      }
    }
  : undefined;

const findings = await scan(targetDir, onProgress);
const result = score(findings);

// ── Per-tool scoring (if requested) ───────────────────────
const toolResults = flags.tools ? scoreAllTools(findings) : null;

if (flags.badge) {
  const badgeColor = result.color === 'green' ? 'brightgreen' : result.color === 'yellow' ? 'yellow' : 'red';
  const label = 'AI Ready';
  const message = `${result.grade} ${result.normalized}/10`;
  const url = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${badgeColor}`;
  console.log(`[![AI Ready](${url})](https://github.com/f/check-ai)`);
} else if (flags.json) {
  if (flags.tools && toolResults) {
    reportToolsJson(toolResults);
  } else {
    reportJson(result, findings);
  }
} else if (interactive) {
  await reportInteractive(result, findings, { verbose: flags.verbose });
  if (flags.tools && toolResults) {
    await reportToolsInteractive(toolResults, { verbose: flags.verbose });
  }
} else {
  console.log('');
  report(result, findings, { verbose: flags.verbose });
  if (flags.tools && toolResults) {
    reportTools(toolResults, { verbose: flags.verbose });
  }
}

// Exit with non-zero if score is below threshold (useful in CI)
if (result.normalized < 3) {
  process.exit(1);
}
