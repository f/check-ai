/**
 * Scoring tiers and logic.
 *
 * Total possible points across all checks varies, but we normalize to a
 * 0-10 scale and assign a letter grade + label.
 */

const TIERS = [
  { min: 9, grade: 'A+', label: 'Exemplary — fully AI-ready', color: 'green', emoji: '🏆' },
  { min: 7, grade: 'A', label: 'Strong — AI-ready', color: 'green', emoji: '✅' },
  { min: 5, grade: 'B', label: 'Decent — partially AI-ready', color: 'yellow', emoji: '🔶' },
  { min: 3, grade: 'C', label: 'Weak — minimal AI setup', color: 'yellow', emoji: '⚠️' },
  { min: 1, grade: 'D', label: 'Poor — barely AI-aware', color: 'red', emoji: '🔻' },
  { min: 0, grade: 'F', label: 'None — not AI-ready', color: 'red', emoji: '❌' },
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
