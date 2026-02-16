#!/usr/bin/env node

import { scan } from '../src/scanner.mjs';
import { score } from '../src/scorer.mjs';
import { report, reportInteractive, reportJson, createSpinner } from '../src/reporter.mjs';
import { resolve, basename } from 'path';

// ── Parse args ────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {
  json: false,
  verbose: false,
  help: false,
  version: false,
  noInteractive: false,
};
let targetPath = '.';

for (const arg of args) {
  if (arg === '--json')                          flags.json = true;
  else if (arg === '--verbose' || arg === '-v')  flags.verbose = true;
  else if (arg === '--help'   || arg === '-h')   flags.help = true;
  else if (arg === '--version')                  flags.version = true;
  else if (arg === '--no-interactive' || arg === '--ci') flags.noInteractive = true;
  else if (!arg.startsWith('-'))                 targetPath = arg;
}

// Auto-detect: disable interactive when piped or in CI
const isTTY = process.stdout.isTTY && !process.env.CI;
const interactive = isTTY && !flags.json && !flags.noInteractive;

// ── Help ──────────────────────────────────────────────────
if (flags.help) {
  console.log(`
  check-ai — Audit any repo for AI-readiness

  Usage
    $ check-ai [directory] [options]

  Options
    --json             Output results as JSON
    --verbose, -v      Show all recommendations (including low-priority)
    --no-interactive   Disable animated output (auto-detected in CI / pipes)
    --ci               Alias for --no-interactive
    -h, --help         Show this help message
    --version          Show version

  Examples
    $ check-ai                  # audit current directory
    $ check-ai ./my-project     # audit a specific repo
    $ check-ai --json           # machine-readable output
    $ check-ai . --verbose      # include nice-to-have suggestions
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
} else if (!flags.json) {
  console.log('');
  console.log(`  🔍 Auditing ${repoName} …`);
}

// Progress callback for interactive mode
const onProgress = interactive ? (ev) => {
  if (ev.phase === 'deep-scan') {
    spinner.update('Deep scanning file tree …');
  } else if (ev.phase === 'deep-scan-done') {
    spinner.update(`Scanned ${ev.filesScanned.toLocaleString()} files in ${ev.dirsScanned.toLocaleString()} dirs — analyzing …`);
  } else if (ev.phase === 'checking') {
    spinner.update(`Checking ${ev.current}/${ev.total}: ${ev.label}`);
  } else if (ev.phase === 'done') {
    spinner.stop(`Scanned ${repoName} — ${ev.total} checks complete`);
  }
} : undefined;

const findings = await scan(targetDir, onProgress);
const result = score(findings);

if (flags.json) {
  reportJson(result, findings);
} else if (interactive) {
  await reportInteractive(result, findings, { verbose: flags.verbose });
} else {
  console.log('');
  report(result, findings, { verbose: flags.verbose });
}

// Exit with non-zero if score is below threshold (useful in CI)
if (result.normalized < 3) {
  process.exit(1);
}
