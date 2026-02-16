/**
 *  CLIO — Command Line Intelligence Orchestrator configuration.
 *
 * CLIO is a Perl-based AI coding assistant with sophisticated
 * long-term memory, session management, and multi-agent coordination.
 */

import { existsSync } from 'fs';
import { join } from 'path';

export const section = 'CLIO';

export const checks = [
  // Core CLIO directory
  {
    id: 'clio-config-dir',
    label: '.clio/ directory',
    section,
    weight: 5,
    paths: ['.clio'],
    type: 'dir',
    description: 'CLIO configuration and state directory',
  },

  // Instructions file (like CLAUDE.md but for CLIO)
  {
    id: 'clio-instructions',
    label: '.clio/instructions.md',
    section,
    weight: 4,
    paths: ['.clio/instructions.md'],
    type: 'file',
    description: 'CLIO project-specific agent instructions (methodology, checkpoints, workflows)',
  },

  // Long-term memory
  {
    id: 'clio-ltm',
    label: '.clio/ltm.json',
    section,
    weight: 3,
    paths: ['.clio/ltm.json'],
    type: 'file',
    description: 'CLIO long-term memory - persistent discoveries, solutions, and patterns',
  },

  // Memory directory
  {
    id: 'clio-memory',
    label: '.clio/memory/',
    section,
    weight: 2,
    paths: ['.clio/memory'],
    type: 'dir',
    description: 'CLIO session memory storage directory',
  },

  // Sessions directory
  {
    id: 'clio-sessions',
    label: '.clio/sessions/',
    section,
    weight: 2,
    paths: ['.clio/sessions'],
    type: 'dir',
    description: 'CLIO session state persistence (todos, tool results, conversation history)',
  },

  // Embeddings directory
  {
    id: 'clio-embeddings',
    label: '.clio/embeddings/',
    section,
    weight: 2,
    paths: ['.clio/embeddings'],
    type: 'dir',
    description: 'CLIO code embeddings for semantic search',
  },

  // Logs directory
  {
    id: 'clio-logs',
    label: '.clio/logs/',
    section,
    weight: 1,
    paths: ['.clio/logs'],
    type: 'dir',
    description: 'CLIO debug and tool execution logs',
  },

  // Instructions quality check
  {
    id: 'clio-instructions-quality',
    label: 'Instructions quality',
    section,
    weight: 3,
    paths: [],
    type: 'custom',
    custom: 'clio-instructions-quality',
    description: 'CLIO instructions cover methodology, checkpoints, and workflows',
  },

  // LTM quality check
  {
    id: 'clio-ltm-quality',
    label: 'LTM knowledge depth',
    section,
    weight: 2,
    paths: [],
    type: 'custom',
    custom: 'clio-ltm-quality',
    description: 'CLIO long-term memory contains learned patterns and solutions',
  },
];

/**
 * Custom check handlers for this audit.
 */
export function analyze(rootDir, ctx) {
  const results = {};

  // Instructions quality analysis
  results['clio-instructions-quality'] = (() => {
    const instrPath = ctx.join(rootDir, '.clio/instructions.md');
    if (!ctx.existsSync(instrPath)) {
      return { found: false };
    }

    const content = ctx.readFileSafe(instrPath);
    if (!content) return { found: false };

    const lower = content.toLowerCase();
    const signals = {
      hasMethodology: /\b(methodology|unbroken method|principles|framework)\b/.test(lower),
      hasCheckpoints: /\b(checkpoint|collaboration|approval|verification)\b/.test(lower),
      hasWorkflow: /\b(workflow|protocol|process|procedure)\b/.test(lower),
      hasOwnership: /\b(ownership|scope|responsibility|authority)\b/.test(lower),
      hasHandoff: /\b(handoff|handover|session|continuity)\b/.test(lower),
      hasCodeExamples: /```/.test(content),
      hasHeadings: (content.match(/^#{1,3}\s/gm) || []).length >= 5,
      isSubstantial: content.split('\n').filter((l) => l.trim()).length >= 50,
    };

    const score = Object.values(signals).filter((v) => v === true).length;
    const quality = score >= 6 ? 'comprehensive' : score >= 4 ? 'good' : score >= 2 ? 'basic' : 'minimal';

    return {
      found: score >= 4,
      detail: `${quality} (${score}/8 signals)`,
      analysis: { signals, quality, score, maxScore: 8 },
    };
  })();

  // LTM quality analysis
  results['clio-ltm-quality'] = (() => {
    const ltmPath = ctx.join(rootDir, '.clio/ltm.json');
    if (!ctx.existsSync(ltmPath)) {
      return { found: false };
    }

    try {
      const content = ctx.readFileSafe(ltmPath);
      const ltm = JSON.parse(content);

      // CLIO LTM structure: patterns.discoveries, patterns.problem_solutions, patterns.code_patterns
      const patternsObj = ltm.patterns || {};
      const discoveries = patternsObj.discoveries || [];
      const solutions = patternsObj.problem_solutions || [];
      const patterns = patternsObj.code_patterns || [];

      const totalEntries = discoveries.length + solutions.length + patterns.length;
      const hasDiscoveries = discoveries.length > 0;
      const hasSolutions = solutions.length > 0;
      const hasPatterns = patterns.length > 0;
      const hasHighConfidence = [...discoveries, ...patterns].some(
        (e) => e.confidence && e.confidence >= 0.8
      );
      const hasVerified = discoveries.some((d) => d.verified === true || d.verified === 1);

      const signals = { hasDiscoveries, hasSolutions, hasPatterns, hasHighConfidence, hasVerified };
      const score = Object.values(signals).filter((v) => v === true).length;

      const detail =
        totalEntries > 0
          ? `${discoveries.length} discoveries, ${solutions.length} solutions, ${patterns.length} patterns`
          : null;

      return {
        found: totalEntries >= 3 && score >= 2,
        detail,
        analysis: {
          discoveries: discoveries.length,
          solutions: solutions.length,
          patterns: patterns.length,
          signals,
          score,
          maxScore: 5,
        },
      };
    } catch {
      return { found: false, detail: 'invalid JSON' };
    }
  })();

  return results;
}
