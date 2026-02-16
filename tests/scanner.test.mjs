/**
 * Tests for the scanner — dynamic loading, deep scan, check evaluation.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scan, loadAudits } from '../src/scanner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '.fixtures');

// ── Fixture setup/teardown ──────────────────────────────────────────

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

// ── Tests ───────────────────────────────────────────────────────────

describe('loadAudits()', () => {
  it('should load all audit modules', async () => {
    const audits = await loadAudits();
    assert.ok(audits.length >= 8, `Expected ≥8 audits, got ${audits.length}`);
    for (const a of audits) {
      assert.ok(a.file.endsWith('.mjs'));
      assert.equal(typeof a.section, 'string');
      assert.ok(Array.isArray(a.checks));
    }
  });

  it('should return audits sorted alphabetically by filename', async () => {
    const audits = await loadAudits();
    const names = audits.map((a) => a.file);
    const sorted = [...names].sort();
    assert.deepEqual(names, sorted);
  });
});

describe('scan() — empty repo', () => {
  let findings;

  before(async () => {
    const root = setupFixture('empty');
    findings = await scan(root);
  });

  it('should return findings array', () => {
    assert.ok(Array.isArray(findings));
    assert.ok(findings.length > 0);
  });

  it('should have no found checks in an empty repo (excluding git-history checks)', () => {
    // Git commit checks may inherit parent repo history in fixtures
    const gitChecks = new Set(['commit-messages', 'conventional-commits']);
    const nonGit = findings.filter(f => !gitChecks.has(f.id));
    const foundCount = nonGit.filter(f => f.found).length;
    assert.equal(foundCount, 0, `Expected 0 found, got ${foundCount}: ${nonGit.filter(f => f.found).map(f => f.id).join(', ')}`);
  });

  it('should include all standard check fields', () => {
    for (const f of findings) {
      assert.equal(typeof f.id, 'string');
      assert.equal(typeof f.label, 'string');
      assert.equal(typeof f.section, 'string');
      assert.equal(typeof f.weight, 'number');
      assert.equal(typeof f.found, 'boolean');
    }
  });
});

describe('scan() — file detection', () => {
  it('should detect .gitignore (file type)', async () => {
    const root = setupFixture('gitignore', { '.gitignore': 'node_modules/' });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'gitignore');
    assert.ok(check, 'gitignore check not found');
    assert.equal(check.found, true);
  });

  it('should detect README.md', async () => {
    const root = setupFixture('readme', { 'README.md': '# Hello\n\nSome content\n' });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'readme');
    assert.ok(check);
    assert.equal(check.found, true);
  });

  it('should detect AGENTS.md', async () => {
    const root = setupFixture('agents', {
      'AGENTS.md': '# AGENTS\n\n## Overview\n\nProject structure and build commands.\n',
    });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'agents-md');
    assert.ok(check);
    assert.equal(check.found, true);
  });
});

describe('scan() — directory detection', () => {
  it('should detect .git directory', async () => {
    const root = setupFixture('git-dir', {}, ['.git']);
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'git-repo');
    assert.ok(check);
    assert.equal(check.found, true);
  });

  it('should detect test directory', async () => {
    const root = setupFixture('test-dir', {}, ['tests']);
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'test-dir');
    assert.ok(check);
    assert.equal(check.found, true);
  });
});

describe('scan() — deep scan', () => {
  it('should find nested AGENTS.md files', async () => {
    const root = setupFixture('deep-agents', {
      'AGENTS.md': '# Root',
      'src/AGENTS.md': '# Src agents',
      'src/lib/AGENTS.md': '# Deep agents',
    });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'agents-md-nested');
    assert.ok(check);
    assert.equal(check.found, true);
    assert.ok(check.matches.length >= 2, `Expected ≥2 nested, got ${check.matches.length}`);
  });

  it('should find .prompt.yml files', async () => {
    const root = setupFixture('deep-prompts', {
      'prompts/review.prompt.yml': 'name: review',
      'src/gen.prompt.yml': 'name: gen',
    });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'prompt-yml');
    assert.ok(check);
    assert.equal(check.found, true);
    assert.ok(check.matches.length >= 1);
  });

  it('should skip node_modules during deep scan', async () => {
    const root = setupFixture('skip-dirs', {
      'node_modules/pkg/AGENTS.md': '# Should be skipped',
      'src/AGENTS.md': '# Should be found',
    });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'agents-md-nested');
    assert.ok(check);
    // Only src/AGENTS.md should be found, not node_modules one
    if (check.found) {
      for (const m of check.matches) {
        assert.ok(!m.includes('node_modules'), `Should not find in node_modules: ${m}`);
      }
    }
  });
});

describe('scan() — custom checks', () => {
  it('should detect scripts in package.json', async () => {
    const root = setupFixture('scripts', {
      'package.json': JSON.stringify({
        scripts: { start: 'node index.js', test: 'jest', lint: 'eslint .' },
      }),
    });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'scripts');
    assert.ok(check);
    assert.equal(check.found, true);
    assert.ok(check.detail.includes('3/3'));
  });

  it('should detect AI deps in package.json', async () => {
    const root = setupFixture('ai-deps', {
      'package.json': JSON.stringify({
        dependencies: { openai: '^4.0.0', express: '^5.0.0' },
      }),
    });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'ai-deps');
    assert.ok(check);
    assert.equal(check.found, true);
    assert.ok(check.detail.includes('openai'));
  });

  it('should detect MCP server count', async () => {
    const root = setupFixture('mcp', {
      '.mcp.json': JSON.stringify({
        mcpServers: { memory: {}, context7: {}, playwright: {} },
      }),
    });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'mcp-json-quality');
    assert.ok(check);
    assert.equal(check.found, true);
    assert.ok(check.detail.includes('3 server'));
  });

  it('should detect has-any-agent-tool when AGENTS.md exists', async () => {
    const root = setupFixture('any-tool', { 'AGENTS.md': '# Agents' });
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'has-any-agent-tool');
    assert.ok(check);
    assert.equal(check.found, true);
  });
});

describe('scan() — any type', () => {
  it('should match file or directory for any type', async () => {
    const root = setupFixture('any-type', {}, ['.devcontainer']);
    const findings = await scan(root);
    const check = findings.find((f) => f.id === 'devcontainer');
    assert.ok(check);
    assert.equal(check.found, true);
  });
});

describe('scan() — progress callback', () => {
  it('should emit progress events', async () => {
    const root = setupFixture('progress');
    const events = [];
    await scan(root, (ev) => events.push(ev));

    const phases = events.map((e) => e.phase);
    assert.ok(phases.includes('deep-scan'), 'Missing deep-scan phase');
    assert.ok(phases.includes('deep-scan-done'), 'Missing deep-scan-done phase');
    assert.ok(phases.includes('checking'), 'Missing checking phase');
    assert.ok(phases.includes('done'), 'Missing done phase');
  });

  it('should report correct total in done event', async () => {
    const root = setupFixture('progress-total');
    let doneEvent;
    await scan(root, (ev) => {
      if (ev.phase === 'done') doneEvent = ev;
    });
    assert.ok(doneEvent);
    assert.ok(doneEvent.total >= 66, `Expected ≥66 checks, got ${doneEvent.total}`);
  });
});

// Cleanup
describe('cleanup', () => {
  it('should remove fixture directory', () => {
    cleanFixtures();
    assert.ok(!existsSync(FIXTURES_DIR));
  });
});
