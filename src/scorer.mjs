/**
 * Scoring tiers and logic.
 *
 * Total possible points across all checks varies, but we normalize to a
 * 0-10 scale and assign a letter grade + label.
 */

import { TOOL_PROFILES, getToolKeys, detectConfiguredTools } from './tool-profiles.mjs';

const TIERS = [
  { min: 9, grade: 'A+', label: 'Exemplary — fully AI-ready', color: 'green', emoji: '' },
  { min: 7, grade: 'A', label: 'Strong — AI-ready', color: 'green', emoji: '[OK]' },
  { min: 5, grade: 'B', label: 'Decent — partially AI-ready', color: 'yellow', emoji: '' },
  { min: 3, grade: 'C', label: 'Weak — minimal AI setup', color: 'yellow', emoji: '[WARN]️' },
  { min: 1, grade: 'D', label: 'Poor — barely AI-aware', color: 'red', emoji: '' },
  { min: 0, grade: 'F', label: 'None — not AI-ready', color: 'red', emoji: '[FAIL]' },
];

// Ordered section list so the report always prints in a logical sequence
const SECTION_ORDER = [
  'Repo Hygiene',
  'Grounding Docs',
  'Testing',
  'Agent Configs',
  'AI Context',
  'Prompts & Skills',
  'MCP',
  'AI Deps',
];

export function score(findings) {
  const maxPoints = findings.reduce((sum, f) => sum + f.weight, 0);
  const earnedPoints = findings.filter((f) => f.found).reduce((sum, f) => sum + f.weight, 0);

  const normalized = maxPoints > 0 ? (earnedPoints / maxPoints) * 10 : 0;

  // Section breakdown (ordered)
  const sections = {};
  for (const name of SECTION_ORDER) {
    sections[name] = { earned: 0, max: 0, items: [] };
  }
  for (const f of findings) {
    const sec = f.section || 'Other';
    if (!sections[sec]) sections[sec] = { earned: 0, max: 0, items: [] };
    sections[sec].max += f.weight;
    if (f.found) sections[sec].earned += f.weight;
    sections[sec].items.push(f);
  }

  const tier = TIERS.find((t) => normalized >= t.min) || TIERS[TIERS.length - 1];

  return {
    earnedPoints,
    maxPoints,
    normalized: Math.round(normalized * 10) / 10,
    grade: tier.grade,
    label: tier.label,
    color: tier.color,
    emoji: tier.emoji,
    sections,
    foundCount: findings.filter((f) => f.found).length,
    totalChecks: findings.length,
  };
}

/**
 * Score findings for a specific tool.
 *
 * Calculates a score based only on checks relevant to the tool,
 * excluding checks that don't apply to that tool.
 */
export function scoreForTool(findings, toolKey) {
  const profile = TOOL_PROFILES[toolKey];
  if (!profile) return null;

  const findingMap = new Map(findings.map(f => [f.id, f]));
  const notApplicable = new Set(profile.notApplicable || []);

  // Filter to only applicable checks
  const applicableFindings = findings.filter(f => !notApplicable.has(f.id));

  // Calculate which required checks pass
  const requiredChecks = profile.required || [];
  const requiredPassed = requiredChecks.filter(id => {
    const f = findingMap.get(id);
    return f && f.found;
  });

  // Calculate which valuable checks pass
  const valuableChecks = profile.valuable || [];
  const valuablePassed = valuableChecks.filter(id => {
    const f = findingMap.get(id);
    return f && f.found;
  });

  // Handle alternatives - if either in pair passes, both count
  const alternatives = profile.alternatives || [];
  let alternativeBonus = 0;
  for (const [a, b] of alternatives) {
    const aFound = findingMap.get(a)?.found;
    const bFound = findingMap.get(b)?.found;
    if (aFound || bFound) {
      alternativeBonus += 1;
    }
  }

  // Calculate score
  // Required checks are worth 2 points each, valuable 1 point
  const requiredMax = requiredChecks.length * 2;
  const valuableMax = valuableChecks.length;
  const totalMax = requiredMax + valuableMax;

  const requiredEarned = requiredPassed.length * 2;
  const valuableEarned = valuablePassed.length;
  const totalEarned = requiredEarned + valuableEarned;

  const percentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const normalized = totalMax > 0 ? Math.round((totalEarned / totalMax) * 10 * 10) / 10 : 0;

  const tier = TIERS.find(t => normalized >= t.min) || TIERS[TIERS.length - 1];

  return {
    toolKey,
    name: profile.name,
    icon: profile.icon,
    description: profile.description,
    percentage,
    normalized,
    grade: tier.grade,
    color: tier.color,
    required: {
      passed: requiredPassed.length,
      total: requiredChecks.length,
      checks: requiredChecks.map(id => ({
        id,
        found: findingMap.get(id)?.found || false,
        label: findingMap.get(id)?.label || id,
      })),
    },
    valuable: {
      passed: valuablePassed.length,
      total: valuableChecks.length,
    },
    earned: totalEarned,
    max: totalMax,
    applicableChecks: applicableFindings.length,
  };
}

/**
 * Score findings for all configured tools.
 * Only scores tools that appear to be in use based on findings.
 */
export function scoreAllTools(findings) {
  const configuredTools = detectConfiguredTools(findings);
  const toolScores = {};

  for (const toolKey of configuredTools) {
    toolScores[toolKey] = scoreForTool(findings, toolKey);
  }

  return {
    configuredTools,
    toolScores,
    totalTools: getToolKeys().length,
  };
}

/**
 * Score findings for a list of specific tools.
 */
export function scoreTools(findings, toolKeys) {
  const toolScores = {};

  for (const toolKey of toolKeys) {
    const result = scoreForTool(findings, toolKey);
    if (result) {
      toolScores[toolKey] = result;
    }
  }

  return {
    requestedTools: toolKeys,
    toolScores,
  };
}
