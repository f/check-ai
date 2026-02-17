/**
 * Interactive terminal output for the AI audit report.
 * Zero dependencies — uses only ANSI escape codes + Node built-ins.
 */

import { createInterface } from 'readline';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ITALIC = '\x1b[3m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const GRAY = '\x1b[90m';
const MAGENTA = '\x1b[35m';
const BG_GREEN = '\x1b[42m';
const BG_YELLOW = '\x1b[43m';
const BG_RED = '\x1b[41m';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const CLEAR_LINE = '\x1b[2K\r';

const COLORS = { green: GREEN, yellow: YELLOW, red: RED };
const BG_COLORS = { green: BG_GREEN, yellow: BG_YELLOW, red: BG_RED };

const SECTION_ICONS = {
  'Repo Hygiene': '🧹',
  'Grounding Docs': '📄',
  Testing: '🧪',
  'Agent Configs': '🤖',
  'AI Context': '🔒',
  'Prompts & Skills': '🧩',
  MCP: '🔌',
  'AI Deps': '📦',
};

const SEC_NAME_WIDTH = Math.max(...Object.keys(SECTION_ICONS).map((n) => n.length));

// ───────────────────────────────────────────────────────────────────────
//  Utilities
// ───────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bar(earned, max, width = 20) {
  const ratio = max > 0 ? earned / max : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const color = ratio >= 0.7 ? GREEN : ratio >= 0.4 ? YELLOW : RED;
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}

function scoreBar(normalized, width = 40) {
  const filled = Math.round((normalized / 10) * width);
  const empty = width - filled;
  const color = normalized >= 7 ? GREEN : normalized >= 4 ? YELLOW : RED;
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}

function pct(earned, max) {
  if (max === 0) return '0%';
  return `${Math.round((earned / max) * 100)}%`;
}

function w(s) {
  process.stdout.write(s);
}

// ───────────────────────────────────────────────────────────────────────
//  Spinner for scan progress
// ───────────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function createSpinner() {
  let frame = 0;
  let interval = null;
  let currentMsg = '';

  return {
    start(msg) {
      currentMsg = msg;
      w(HIDE_CURSOR);
      interval = setInterval(() => {
        w(`${CLEAR_LINE}  ${CYAN}${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]}${RESET} ${currentMsg}`);
        frame++;
      }, 80);
    },
    update(msg) {
      currentMsg = msg;
    },
    stop(finalMsg) {
      if (interval) clearInterval(interval);
      w(`${CLEAR_LINE}  ${GREEN}✔${RESET} ${finalMsg || currentMsg}\n`);
      w(SHOW_CURSOR);
    },
  };
}

// ───────────────────────────────────────────────────────────────────────
//  Animated bar fill
// ───────────────────────────────────────────────────────────────────────

async function animateBar(earned, max, width = 15, stepMs = 12, prefix = '') {
  const ratio = max > 0 ? earned / max : 0;
  const target = Math.round(ratio * width);
  const color = ratio >= 0.7 ? GREEN : ratio >= 0.4 ? YELLOW : RED;

  for (let i = 0; i <= target; i++) {
    const empty = width - i;
    w(`\r${prefix}${color}${'█'.repeat(i)}${DIM}${'░'.repeat(empty)}${RESET}`);
    await sleep(stepMs);
  }
}

// ───────────────────────────────────────────────────────────────────────
//  Section rendering (shared by interactive and static)
// ───────────────────────────────────────────────────────────────────────

function renderSectionHeader(secName, sec) {
  const icon = SECTION_ICONS[secName] || '📦';
  const secPct = pct(sec.earned, sec.max);
  const ratio = sec.max > 0 ? sec.earned / sec.max : 0;
  const secColor = ratio >= 0.7 ? GREEN : ratio >= 0.4 ? YELLOW : RED;

  const padded = secName.padEnd(SEC_NAME_WIDTH);
  return `  ${icon} ${BOLD}${padded}${RESET}  ${bar(sec.earned, sec.max, 15)}  ${secColor}${secPct.padStart(4)}${RESET} ${DIM}(${sec.earned}/${sec.max})${RESET}`;
}

function renderItem(item) {
  if (item.found) {
    const detail = item.detail ? ` ${GRAY}${item.detail}${RESET}` : '';
    const matchPath = item.matchedPath ? ` ${GRAY}→ ${item.matchedPath}${RESET}` : '';
    const matches =
      item.matches && item.matches.length > 0
        ? ` ${GRAY}→ ${item.matches.slice(0, 5).join(', ')}${item.matches.length > 5 ? ` +${item.matches.length - 5} more` : ''}${RESET}`
        : '';
    return `     ${GREEN}✔${RESET}  ${item.label}${detail}${matchPath}${matches}`;
  }
  return `     ${DIM}✘  ${item.label}${RESET}`;
}

// ───────────────────────────────────────────────────────────────────────
//  Interactive report — compact sub-scrolling dashboard
// ───────────────────────────────────────────────────────────────────────

const MOVE_UP = (n) => (n > 0 ? `\x1b[${n}A` : '');
const MOVE_DOWN = (n) => (n > 0 ? `\x1b[${n}B` : '');

const MAX_VISIBLE_ITEMS = 5;

function renderSectionHeaderCompact(secName, sec, active = false, done = false) {
  const icon = SECTION_ICONS[secName] || '📦';
  const secPct = pct(sec.earned, sec.max);
  const ratio = sec.max > 0 ? sec.earned / sec.max : 0;
  const secColor = ratio >= 0.7 ? GREEN : ratio >= 0.4 ? YELLOW : RED;
  const arrow = active ? `${CYAN}▸${RESET} ` : done ? `${GREEN}✓${RESET} ` : `${DIM}○${RESET} `;
  const nameStyle = active ? `${BOLD}${WHITE}` : done ? `${BOLD}` : `${DIM}`;
  const padded = secName.padEnd(SEC_NAME_WIDTH);
  return `  ${arrow}${icon} ${nameStyle}${padded}${RESET}  ${bar(sec.earned, sec.max, 12)}  ${secColor}${secPct.padStart(4)}${RESET} ${DIM}(${sec.earned}/${sec.max})${RESET}`;
}

function renderItemCompact(item) {
  if (item.found) {
    const detail = item.detail ? ` ${GRAY}${item.detail}${RESET}` : '';
    const matchPath = item.matchedPath ? ` ${GRAY}→ ${item.matchedPath}${RESET}` : '';
    const matches =
      item.matches && item.matches.length > 0
        ? ` ${GRAY}→ ${item.matches.slice(0, 3).join(', ')}${item.matches.length > 3 ? ` +${item.matches.length - 3} more` : ''}${RESET}`
        : '';
    return `       ${GREEN}✔${RESET} ${item.label}${detail}${matchPath}${matches}`;
  }
  return `       ${DIM}✘ ${item.label}${RESET}`;
}

/**
 * Draws the full compact dashboard frame.
 * Returns the number of lines written.
 */
function drawDashboard(secNames, sections, activeIdx, scrollState) {
  const lines = [];

  for (let i = 0; i < secNames.length; i++) {
    const secName = secNames[i];
    const sec = sections[secName];
    if (sec.items.length === 0) continue;

    const isActive = i === activeIdx;
    const isDone = i < activeIdx;
    lines.push(renderSectionHeaderCompact(secName, sec, isActive, isDone));

    // Show scrolling items only for the active section
    if (isActive && scrollState.items.length > 0) {
      const items = scrollState.items;
      const total = sec.items.length;
      const visible = items.slice(-MAX_VISIBLE_ITEMS);

      // Show scroll-up indicator if items are hidden above
      if (items.length > MAX_VISIBLE_ITEMS) {
        lines.push(`       ${DIM}↑ ${items.length - MAX_VISIBLE_ITEMS} more above${RESET}`);
      }

      for (const item of visible) {
        lines.push(renderItemCompact(item));
      }

      // Show remaining count below
      const remaining = total - items.length;
      if (remaining > 0) {
        lines.push(`       ${DIM}… ${remaining} remaining${RESET}`);
      }
    }
  }

  return lines;
}

export async function reportInteractive(result, findings, opts = {}) {
  const { normalized, grade, label, color, sections, earnedPoints, maxPoints, foundCount, totalChecks } = result;

  const c = COLORS[color] || WHITE;
  const bg = BG_COLORS[color] || '';
  const line = '─'.repeat(50);

  w(HIDE_CURSOR);
  console.log('');

  const secNames = Object.keys(sections).filter((n) => sections[n].items.length > 0);
  let prevLineCount = 0;

  // ── Animate section-by-section ────────────────────────
  for (let activeIdx = 0; activeIdx < secNames.length; activeIdx++) {
    const secName = secNames[activeIdx];
    const sec = sections[secName];
    const scrollState = { items: [] };

    // Draw initial state with active section highlighted
    {
      const frame = drawDashboard(secNames, sections, activeIdx, scrollState);
      // Erase previous frame
      if (prevLineCount > 0) {
        w(MOVE_UP(prevLineCount));
        for (let j = 0; j < prevLineCount; j++) w(`${CLEAR_LINE}\n`);
        w(MOVE_UP(prevLineCount));
      }
      for (const l of frame) w(`${CLEAR_LINE}${l}\n`);
      prevLineCount = frame.length;
    }

    await sleep(80);

    // Reveal items one by one with scrolling
    for (const item of sec.items) {
      scrollState.items.push(item);

      const frame = drawDashboard(secNames, sections, activeIdx, scrollState);
      if (prevLineCount > 0) {
        w(MOVE_UP(prevLineCount));
        for (let j = 0; j < prevLineCount; j++) w(`${CLEAR_LINE}\n`);
        w(MOVE_UP(prevLineCount));
      }
      for (const l of frame) w(`${CLEAR_LINE}${l}\n`);
      prevLineCount = frame.length;

      await sleep(20);
    }

    await sleep(100);
  }

  // ── Final expanded view (all done) — shows every check ──
  {
    if (prevLineCount > 0) {
      w(MOVE_UP(prevLineCount));
      for (let j = 0; j < prevLineCount; j++) w(`${CLEAR_LINE}\n`);
      w(MOVE_UP(prevLineCount));
    }
    for (const secName of secNames) {
      const sec = sections[secName];
      w(`${CLEAR_LINE}${renderSectionHeader(secName, sec)}\n`);
      for (const item of sec.items) {
        w(`${CLEAR_LINE}${renderItem(item)}\n`);
      }
      w(`${CLEAR_LINE}\n`);
    }
  }

  w(SHOW_CURSOR);

  // ── Recommendations ─────────────────────────────────────
  renderRecommendations(findings, opts);

  // ── Quick start hint ───────────────────────────────────
  if (normalized < 1) {
    console.log(`  ${CYAN}${BOLD}Quick start:${RESET}`);
    console.log(`  ${CYAN}$${RESET} touch AGENTS.md  ${DIM}# universal agent instructions${RESET}`);
    console.log(`  ${CYAN}$${RESET} mkdir -p .cursor/rules .windsurf/workflows .claude`);
    console.log('');
  }

  // ── Score (end) ─────────────────────────────────────────
  console.log(`  ${DIM}${line}${RESET}`);
  console.log('');
  console.log(`   ${bg}${BOLD} ${grade} ${RESET}  ${c}${BOLD}${label}${RESET}`);
  console.log('');
  await animateBar(normalized, 10, 40, 15, '   ');
  w(`  ${BOLD}${normalized}${RESET}${DIM}/10${RESET}\n`);
  console.log(`   ${DIM}${foundCount} of ${totalChecks} checks passed · ${earnedPoints}/${maxPoints} pts${RESET}`);
  console.log('');
  console.log(`  ${DIM}${line}${RESET}`);
  console.log('');
}

// ───────────────────────────────────────────────────────────────────────
//  Static report (non-interactive fallback, e.g. piped output)
// ───────────────────────────────────────────────────────────────────────

export function report(result, findings, opts = {}) {
  const { normalized, grade, label, color, sections, earnedPoints, maxPoints, foundCount, totalChecks } = result;

  const c = COLORS[color] || WHITE;
  const bg = BG_COLORS[color] || '';
  const line = '─'.repeat(50);

  for (const secName of Object.keys(sections)) {
    const sec = sections[secName];
    if (sec.items.length === 0) continue;
    console.log(renderSectionHeader(secName, sec));
    for (const item of sec.items) console.log(renderItem(item));
    console.log('');
  }

  renderRecommendations(findings, opts);

  if (normalized < 1) {
    console.log(`  ${CYAN}${BOLD}Quick start:${RESET}`);
    console.log(`  ${CYAN}$${RESET} touch AGENTS.md  ${DIM}# universal agent instructions${RESET}`);
    console.log(`  ${CYAN}$${RESET} mkdir -p .cursor/rules .windsurf/workflows .claude`);
    console.log('');
  }

  console.log(`  ${DIM}${line}${RESET}`);
  console.log('');
  console.log(`   ${bg}${BOLD} ${grade} ${RESET}  ${c}${BOLD}${label}${RESET}`);
  console.log('');
  console.log(`   ${scoreBar(normalized)}  ${BOLD}${normalized}${RESET}${DIM}/10${RESET}`);
  console.log(`   ${DIM}${foundCount} of ${totalChecks} checks passed · ${earnedPoints}/${maxPoints} pts${RESET}`);
  console.log('');
  console.log(`  ${DIM}${line}${RESET}`);
  console.log('');
}

// ───────────────────────────────────────────────────────────────────────
//  Recommendations (shared)
// ───────────────────────────────────────────────────────────────────────

function renderRecommendations(findings, opts) {
  const critical = findings.filter((f) => !f.found && f.weight >= 10);
  const important = findings.filter((f) => !f.found && f.weight >= 5 && f.weight < 10);
  const nice = findings.filter((f) => !f.found && f.weight >= 3 && f.weight < 5);
  const minor = findings.filter((f) => !f.found && f.weight >= 1 && f.weight < 3);

  if (critical.length === 0 && important.length === 0 && nice.length === 0) return;

  const line = '─'.repeat(50);
  console.log(`  ${DIM}${line}${RESET}`);
  console.log(`  ${BOLD}Recommendations${RESET}`);
  console.log('');

  if (critical.length > 0) {
    console.log(`  ${RED}${BOLD}  Critical (high impact)${RESET}`);
    for (const m of critical) {
      console.log(`    ${RED}●${RESET} ${BOLD}${m.label}${RESET} ${DIM}[${m.section}]${RESET}`);
      console.log(`      ${DIM}${m.description}${RESET}`);
      if (m.hint) console.log(`      ${CYAN}$ ${m.hint}${RESET}`);
    }
    console.log('');
  }

  if (important.length > 0) {
    console.log(`  ${YELLOW}${BOLD}  Important${RESET}`);
    for (const m of important) {
      console.log(`    ${YELLOW}●${RESET} ${BOLD}${m.label}${RESET} ${DIM}— ${m.description}${RESET}`);
      if (m.hint) console.log(`      ${CYAN}$ ${m.hint}${RESET}`);
    }
    console.log('');
  }

  if (nice.length > 0) {
    console.log(`  ${BLUE}${BOLD}  Nice to have${RESET}`);
    for (const m of nice) {
      console.log(`    ${BLUE}●${RESET} ${m.label} ${DIM}— ${m.description}${RESET}`);
      if (m.hint) console.log(`      ${CYAN}$ ${m.hint}${RESET}`);
    }
    console.log('');
  }

  if (minor.length > 0 && opts.verbose) {
    console.log(`  ${DIM}${BOLD}  Other suggestions${RESET}`);
    for (const m of minor) {
      console.log(`    ${DIM}○ ${m.label} — ${m.description}${RESET}`);
    }
    console.log('');
  }
}

// ───────────────────────────────────────────────────────────────────────
//  JSON output
// ───────────────────────────────────────────────────────────────────────

export function reportJson(result, findings) {
  const output = {
    score: result.normalized,
    grade: result.grade,
    label: result.label,
    points: { earned: result.earnedPoints, max: result.maxPoints },
    checks: { passed: result.foundCount, total: result.totalChecks },
    sections: {},
    findings: findings.map((f) => ({
      id: f.id,
      label: f.label,
      section: f.section,
      found: f.found,
      weight: f.weight,
      detail: f.detail || null,
      matchedPath: f.matchedPath || null,
      matches: f.matches || null,
    })),
  };

  for (const [name, sec] of Object.entries(result.sections)) {
    output.sections[name] = {
      earned: sec.earned,
      max: sec.max,
      pct: sec.max > 0 ? Math.round((sec.earned / sec.max) * 100) : 0,
    };
  }

  console.log(JSON.stringify(output, null, 2));
}
