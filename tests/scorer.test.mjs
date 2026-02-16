/**
 * Tests for the scoring engine — normalization, grades, section grouping.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { score } from '../src/scorer.mjs';

// Helper: create a minimal finding
function finding(id, section, weight, found) {
  return { id, label: id, section, weight, type: 'file', found, paths: [], description: '' };
}

describe('score()', () => {
  it('should return all expected fields', () => {
    const result = score([finding('a', 'Repo Hygiene', 5, true)]);
    assert.ok('earnedPoints' in result);
    assert.ok('maxPoints' in result);
    assert.ok('normalized' in result);
    assert.ok('grade' in result);
    assert.ok('label' in result);
    assert.ok('color' in result);
    assert.ok('emoji' in result);
    assert.ok('sections' in result);
    assert.ok('foundCount' in result);
    assert.ok('totalChecks' in result);
  });

  it('should score 10/10 when all checks pass', () => {
    const findings = [finding('a', 'Repo Hygiene', 5, true), finding('b', 'Testing', 3, true)];
    const result = score(findings);
    assert.equal(result.normalized, 10);
    assert.equal(result.earnedPoints, 8);
    assert.equal(result.maxPoints, 8);
    assert.equal(result.foundCount, 2);
    assert.equal(result.totalChecks, 2);
  });

  it('should score 0/10 when no checks pass', () => {
    const findings = [finding('a', 'Repo Hygiene', 5, false), finding('b', 'Testing', 3, false)];
    const result = score(findings);
    assert.equal(result.normalized, 0);
    assert.equal(result.earnedPoints, 0);
    assert.equal(result.foundCount, 0);
  });

  it('should compute partial scores correctly', () => {
    const findings = [finding('a', 'Repo Hygiene', 6, true), finding('b', 'Repo Hygiene', 4, false)];
    const result = score(findings);
    // 6/10 * 10 = 6.0
    assert.equal(result.normalized, 6);
    assert.equal(result.earnedPoints, 6);
    assert.equal(result.maxPoints, 10);
  });

  it('should handle empty findings', () => {
    const result = score([]);
    assert.equal(result.normalized, 0);
    assert.equal(result.earnedPoints, 0);
    assert.equal(result.maxPoints, 0);
    assert.equal(result.foundCount, 0);
    assert.equal(result.totalChecks, 0);
  });
});

describe('Grade assignment', () => {
  it('should assign A+ for score >= 9', () => {
    const findings = [finding('a', 'Repo Hygiene', 10, true)];
    const result = score(findings);
    assert.equal(result.grade, 'A+');
  });

  it('should assign F for score 0', () => {
    const findings = [finding('a', 'Repo Hygiene', 10, false)];
    const result = score(findings);
    assert.equal(result.grade, 'F');
  });

  it('should assign B for score ~5-7', () => {
    // 6/10 = 60% → normalized 6.0
    const findings = [finding('a', 'Repo Hygiene', 6, true), finding('b', 'Testing', 4, false)];
    const result = score(findings);
    assert.equal(result.grade, 'B');
  });

  it('should assign C for score ~3-5', () => {
    // 3/10 → normalized 3.0
    const findings = [finding('a', 'Repo Hygiene', 3, true), finding('b', 'Testing', 7, false)];
    const result = score(findings);
    assert.equal(result.grade, 'C');
  });
});

describe('Section grouping', () => {
  it('should group findings by section', () => {
    const findings = [
      finding('a', 'Repo Hygiene', 5, true),
      finding('b', 'Repo Hygiene', 3, false),
      finding('c', 'Testing', 4, true),
    ];
    const result = score(findings);

    assert.equal(result.sections['Repo Hygiene'].earned, 5);
    assert.equal(result.sections['Repo Hygiene'].max, 8);
    assert.equal(result.sections['Repo Hygiene'].items.length, 2);

    assert.equal(result.sections['Testing'].earned, 4);
    assert.equal(result.sections['Testing'].max, 4);
    assert.equal(result.sections['Testing'].items.length, 1);
  });

  it('should initialize all standard sections even if empty', () => {
    const findings = [finding('a', 'Repo Hygiene', 5, true)];
    const result = score(findings);

    // Standard sections should exist
    assert.ok('Repo Hygiene' in result.sections);
    assert.ok('Grounding Docs' in result.sections);
    assert.ok('Testing' in result.sections);
    assert.ok('Agent Configs' in result.sections);
    assert.ok('AI Context' in result.sections);
    assert.ok('Prompts & Skills' in result.sections);
    assert.ok('MCP' in result.sections);
    assert.ok('AI Deps' in result.sections);
  });

  it('should handle unknown sections gracefully', () => {
    const findings = [finding('a', 'New Section', 5, true)];
    const result = score(findings);
    assert.ok('New Section' in result.sections);
    assert.equal(result.sections['New Section'].earned, 5);
  });
});
