/**
 * CLI integration tests — runs the actual CLI binary and checks output.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'bin', 'cli.mjs');
const FIXTURES_DIR = join(__dirname, '.cli-fixtures');

function run(args = '') {
  try {
    return execSync(`node ${CLI} ${args}`, {
      encoding: 'utf-8',
      timeout: 15000,
      env: { ...process.env, CI: '1' },
    });
  } catch (err) {
    // CLI exits with code 1 when score < 3 — still return stdout
    if (err.stdout) return err.stdout;
    throw err;
  }
}

function setupFixture(name, files = {}, dirs = []) {
  const root = join(FIXTURES_DIR, name);
  if (existsSync(root)) rmSync(root, { recursive: true });
  mkdirSync(root, { recursive: true });
  for (const d of dirs) mkdirSync(join(root, d), { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function cleanFixtures() {
  if (existsSync(FIXTURES_DIR)) rmSync(FIXTURES_DIR, { recursive: true });
}

describe('CLI — help', () => {
  it('should print help with --help', () => {
    const out = run('--help');
    assert.ok(out.includes('check-ai'));
    assert.ok(out.includes('--json'));
    assert.ok(out.includes('--verbose'));
  });

  it('should print help with -h', () => {
    const out = run('-h');
    assert.ok(out.includes('check-ai'));
  });
});

describe('CLI — version', () => {
  it('should print version with --version', () => {
    const out = run('--version').trim();
    assert.match(out, /^\d+\.\d+\.\d+$/);
  });
});

describe('CLI — static output', () => {
  it('should run against the project root in non-interactive mode', () => {
    const out = run('--no-interactive .');
    assert.ok(out.includes('Repo Hygiene'));
    assert.ok(out.includes('checks passed'));
  });

  it('should show score at the end', () => {
    const out = run('--no-interactive .');
    const lines = out.split('\n');
    const scoreLine = lines.find((l) => l.includes('/10'));
    assert.ok(scoreLine, 'Should have a /10 score line');
  });
});

describe('CLI — JSON output', () => {
  it('should output valid JSON with --json', () => {
    const out = run('--json .');
    const data = JSON.parse(out);
    assert.equal(typeof data.score, 'number');
    assert.equal(typeof data.grade, 'string');
    assert.equal(typeof data.label, 'string');
    assert.ok(data.checks);
    assert.ok(data.sections);
    assert.ok(Array.isArray(data.findings));
  });

  it('should have correct structure in JSON', () => {
    const data = JSON.parse(run('--json .'));
    assert.ok(data.score >= 0 && data.score <= 10);
    assert.ok(data.checks.passed >= 0);
    assert.ok(data.checks.total >= 66);
    assert.ok(data.points.earned >= 0);
    assert.ok(data.points.max > 0);
  });

  it('should include all findings with required fields', () => {
    const data = JSON.parse(run('--json .'));
    for (const f of data.findings) {
      assert.equal(typeof f.id, 'string');
      assert.equal(typeof f.label, 'string');
      assert.equal(typeof f.section, 'string');
      assert.equal(typeof f.found, 'boolean');
      assert.equal(typeof f.weight, 'number');
    }
  });
});

describe('CLI — empty repo', () => {
  it('should score very low for an empty directory', () => {
    const root = setupFixture('empty-cli');
    const data = JSON.parse(run(`--json ${root}`));
    // Git commit checks may inherit parent repo history, so score can be > 0
    assert.ok(data.score <= 1, `Expected score ≤ 1, got ${data.score}`);
    assert.ok(data.grade === 'F' || data.grade === 'D', `Expected F or D, got ${data.grade}`);
  });
});

describe('CLI — exit code', () => {
  it('should exit 1 when score < 3', () => {
    const root = setupFixture('low-score');
    try {
      execSync(`node ${CLI} --json ${root}`, {
        encoding: 'utf-8',
        timeout: 15000,
        env: { ...process.env, CI: '1' },
      });
      // If it doesn't throw, score was >= 3 (shouldn't happen for empty)
      assert.fail('Expected exit code 1');
    } catch (err) {
      assert.equal(err.status, 1);
    }
  });
});

describe('CLI — cleanup', () => {
  it('should remove fixture directory', () => {
    cleanFixtures();
    assert.ok(!existsSync(FIXTURES_DIR));
  });
});
