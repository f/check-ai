/**
 * Tests for audit module structure — ensures all audit files
 * export the correct shape and have valid check definitions.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDITS_DIR = join(__dirname, '..', 'src', 'audits');

const VALID_TYPES = new Set(['file', 'dir', 'any', 'deep-scan', 'custom']);

// Load all audit modules
const auditFiles = readdirSync(AUDITS_DIR)
  .filter((f) => f.endsWith('.mjs'))
  .sort();
const audits = [];
for (const file of auditFiles) {
  const mod = await import(join(AUDITS_DIR, file));
  audits.push({ file, mod });
}

describe('Audit modules', () => {
  it('should find at least 8 audit files', () => {
    assert.ok(auditFiles.length >= 8, `Expected ≥8 audit files, got ${auditFiles.length}`);
  });

  for (const { file, mod } of audits) {
    describe(file, () => {
      it('should export a section string', () => {
        assert.equal(typeof mod.section, 'string');
        assert.ok(mod.section.length > 0, 'section must not be empty');
      });

      it('should export a checks array', () => {
        assert.ok(Array.isArray(mod.checks), 'checks must be an array');
        assert.ok(mod.checks.length > 0, 'checks must have at least one entry');
      });

      it('should export analyze as a function or not at all', () => {
        if (mod.analyze !== undefined) {
          assert.equal(typeof mod.analyze, 'function');
        }
      });

      for (const check of mod.checks) {
        describe(`check: ${check.id}`, () => {
          it('should have required fields', () => {
            assert.equal(typeof check.id, 'string', 'id must be a string');
            assert.equal(typeof check.label, 'string', 'label must be a string');
            assert.equal(typeof check.section, 'string', 'section must be a string');
            assert.equal(typeof check.weight, 'number', 'weight must be a number');
            assert.equal(typeof check.type, 'string', 'type must be a string');
            assert.equal(typeof check.description, 'string', 'description must be a string');
          });

          it('should have a valid type', () => {
            assert.ok(VALID_TYPES.has(check.type), `Invalid type: ${check.type}`);
          });

          it('should have weight between 0 and 20', () => {
            assert.ok(check.weight >= 0 && check.weight <= 20, `Weight ${check.weight} out of range [0, 20]`);
          });

          it('should have paths array for non-custom types', () => {
            assert.ok(Array.isArray(check.paths), 'paths must be an array');
          });

          if (check.type === 'deep-scan') {
            it('should have a deepPattern for deep-scan type', () => {
              assert.equal(typeof check.deepPattern, 'string');
              assert.ok(check.deepPattern.length > 0);
            });
          }

          if (check.type === 'custom') {
            it('should have a custom key for custom type', () => {
              assert.equal(typeof check.custom, 'string');
              assert.ok(check.custom.length > 0);
            });
          }
        });
      }
    });
  }
});

describe('Check ID uniqueness', () => {
  it('should have globally unique check IDs across all audits', () => {
    const allIds = audits.flatMap(({ mod }) => mod.checks.map((c) => c.id));
    const seen = new Set();
    const dupes = [];
    for (const id of allIds) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
    assert.deepEqual(dupes, [], `Duplicate check IDs found: ${dupes.join(', ')}`);
  });
});

describe('Section names', () => {
  it('should have unique section names across audit files', () => {
    const sections = audits.map(({ mod }) => mod.section);
    const seen = new Set();
    const dupes = [];
    for (const s of sections) {
      if (seen.has(s)) dupes.push(s);
      seen.add(s);
    }
    assert.deepEqual(dupes, [], `Duplicate sections: ${dupes.join(', ')}`);
  });

  it('should have checks matching their parent section', () => {
    for (const { file, mod } of audits) {
      for (const check of mod.checks) {
        assert.equal(
          check.section,
          mod.section,
          `Check ${check.id} in ${file} has section "${check.section}" but file exports "${mod.section}"`,
        );
      }
    }
  });
});

describe('Custom check handlers', () => {
  it('should have analyze() for every custom check type', () => {
    for (const { file, mod } of audits) {
      const customChecks = mod.checks.filter((c) => c.type === 'custom');
      if (customChecks.length > 0) {
        assert.equal(typeof mod.analyze, 'function', `${file} has custom checks but no analyze() function`);
      }
    }
  });

  it('should return results for all declared custom keys', () => {
    // Use the project root as the test target
    const rootDir = join(__dirname, '..');
    const readFileSafe = (p) => {
      try {
        return readFileSync(p, 'utf-8');
      } catch {
        return '';
      }
    };
    const ctx = {
      existsSync,
      statSync,
      readFileSync,
      readFileSafe,
      readdirSync,
      join,
      relative,
      lineCount: () => 0,
      dirItemCount: () => 0,
    };

    for (const { file, mod } of audits) {
      if (!mod.analyze) continue;
      const customKeys = mod.checks.filter((c) => c.type === 'custom').map((c) => c.custom);
      const results = mod.analyze(rootDir, ctx);

      for (const key of customKeys) {
        assert.ok(key in results, `${file} analyze() missing result for custom key "${key}"`);
        assert.equal(typeof results[key].found, 'boolean', `${file} result for "${key}" must have boolean "found"`);
      }
    }
  });
});
