import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Ignored directories during tree walks ────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules',
  'vendor',
  'dist',
  'build',
  '.git',
  '__pycache__',
  '.next',
  '.nuxt',
  '.output',
  'coverage',
  '.turbo',
  '.vercel',
  '.netlify',
  '.cache',
  '.parcel-cache',
  'target',
  'out',
  'bin',
  'obj',
]);

// ═══════════════════════════════════════════════════════════════════════
//  DYNAMIC AUDIT LOADER — loads all .mjs files from src/audits/
// ═══════════════════════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDITS_DIR = join(__dirname, 'audits');

/**
 * Dynamically loads all audit modules from src/audits/.
 * Each module exports: checks[], section, and optionally analyze().
 */
async function loadAudits() {
  const files = readdirSync(AUDITS_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .sort();

  const audits = [];
  for (const file of files) {
    const mod = await import(join(AUDITS_DIR, file));
    audits.push({
      file,
      section: mod.section,
      checks: mod.checks || [],
      analyze: mod.analyze || null,
    });
  }
  return audits;
}

// ═══════════════════════════════════════════════════════════════════════
//  DEEP TREE WALKER — single pass, collects all patterns
// ═══════════════════════════════════════════════════════════════════════

function deepScan(rootDir, patterns, maxDepth = 6) {
  const results = {};
  for (const p of patterns) results[p] = [];

  let filesScanned = 0;
  let dirsScanned = 0;

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    dirsScanned++;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);

      if (entry.isFile()) {
        filesScanned++;
        for (const p of patterns) {
          if (entry.name === p || entry.name.endsWith(p)) {
            const rel = relative(rootDir, full);
            // skip root-level matches (those are handled by static checks)
            if (rel.includes('/') || rel.includes('\\')) {
              results[p].push(rel);
            }
          }
        }
      } else if (entry.isDirectory()) {
        if (
          !entry.name.startsWith('.') ||
          entry.name === '.claude' ||
          entry.name === '.agents' ||
          entry.name === '.windsurf' ||
          entry.name === '.cursor' ||
          entry.name === '.github'
        ) {
          walk(full, depth + 1);
        }
      }
    }
  }

  walk(rootDir, 0);
  return { results, filesScanned, dirsScanned };
}

// ═══════════════════════════════════════════════════════════════════════
//  SHARED UTILITIES — passed to audit analyze() functions as ctx
// ═══════════════════════════════════════════════════════════════════════

function readFileSafe(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function lineCount(filePath) {
  try {
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

function dirItemCount(dirPath) {
  try {
    return readdirSync(dirPath).filter((n) => !n.startsWith('.')).length;
  } catch {
    return 0;
  }
}

function existsAny(fullPath) {
  if (!existsSync(fullPath)) return null;
  const stat = statSync(fullPath);
  return stat.isFile() ? 'file' : stat.isDirectory() ? 'dir' : null;
}

/** Context object passed to each audit's analyze() function */
const ctx = { existsSync, statSync, readFileSync, readFileSafe, readdirSync, join, relative, lineCount, dirItemCount };

// ═══════════════════════════════════════════════════════════════════════
//  MAIN SCAN — with progress callback
// ═══════════════════════════════════════════════════════════════════════

export async function scan(rootDir, onProgress) {
  const emit = onProgress || (() => {});
  const findings = [];

  // ── Load all audit modules dynamically ──────────────────
  const audits = await loadAudits();
  const allChecks = audits.flatMap((a) => a.checks);

  // Build a map of custom check handlers from all audits
  const customHandlers = {};
  for (const audit of audits) {
    if (audit.analyze) {
      const results = audit.analyze(rootDir, ctx);
      for (const [key, value] of Object.entries(results)) {
        customHandlers[key] = value;
      }
    }
  }

  // ── Phase 1: Deep tree scan (single pass) ───────────────
  emit({ phase: 'deep-scan', message: 'Deep scanning file tree…' });

  const deepPatterns = allChecks.filter((c) => c.type === 'deep-scan').map((c) => c.deepPattern);

  const { results: deepResults, filesScanned, dirsScanned } = deepScan(rootDir, deepPatterns);

  emit({ phase: 'deep-scan-done', filesScanned, dirsScanned });

  // ── Phase 2: Evaluate each check ────────────────────────
  const totalChecks = allChecks.length;
  let checked = 0;

  for (const check of allChecks) {
    checked++;
    emit({ phase: 'checking', current: checked, total: totalChecks, label: check.label });

    // ── Deep-scan results ─────────────────────────────────
    if (check.type === 'deep-scan') {
      const matches = deepResults[check.deepPattern] || [];
      findings.push({
        ...check,
        found: matches.length > 0,
        matches,
        detail: matches.length > 0 ? `${matches.length} file(s) found` : null,
      });
      continue;
    }

    // ── Custom checks (handled by audit analyze()) ────────
    if (check.type === 'custom' && customHandlers[check.custom]) {
      const result = customHandlers[check.custom];
      findings.push({ ...check, ...result });
      continue;
    }

    // ── "any" type ────────────────────────────────────────
    if (check.type === 'any') {
      let matched = null;
      let detail = null;
      for (const p of check.paths) {
        const full = join(rootDir, p);
        const kind = existsAny(full);
        if (kind) {
          matched = p;
          detail = kind === 'file' ? `${lineCount(full)} line(s)` : `${dirItemCount(full)} item(s)`;
          break;
        }
      }
      findings.push({ ...check, found: !!matched, matchedPath: matched, detail });
      continue;
    }

    // ── Standard file / dir probe ─────────────────────────
    let matched = null;
    let detail = null;
    for (const p of check.paths) {
      const full = join(rootDir, p);
      if (existsSync(full)) {
        matched = p;
        const stat = statSync(full);
        if (stat.isFile()) detail = `${lineCount(full)} line(s)`;
        else if (stat.isDirectory()) detail = `${dirItemCount(full)} item(s)`;
        break;
      }
    }

    findings.push({ ...check, found: !!matched, matchedPath: matched, detail });
  }

  emit({ phase: 'done', total: totalChecks });
  return findings;
}

export { loadAudits };
