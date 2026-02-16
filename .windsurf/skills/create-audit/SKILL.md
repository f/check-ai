---
name: create-audit
description: Create a new audit module for the check-ai scanner. Use this skill when the user wants to add a new audit section that checks for specific files, directories, or patterns in a repository. The skill generates a properly structured .mjs file in src/audits/ that is automatically loaded by the scanner.
---

# Create Audit

Create new audit modules for the `check-ai` AI-readiness scanner. Each audit is a single `.mjs` file in `src/audits/` that is **dynamically loaded** at scan time — no changes to scanner, scorer, or reporter needed.

## Audit File Contract

Every audit file must export:

```js
export const section = 'Section Name';  // shown in report
export const checks = [ ... ];          // array of check objects
// optional:
export function analyze(rootDir, ctx) { return { 'custom-key': { found, detail } }; }
```

The scanner auto-discovers all `.mjs` files in `src/audits/`, sorted alphabetically.

## Check Object Schema

```js
{
  id: 'unique-kebab-id',        // unique across all audits
  label: 'Display label',       // shown in terminal output
  section,                       // use the exported section constant
  weight: 5,                    // 1-20, impact on score
  paths: ['file.md', '.dir/'],  // candidate paths to probe
  type: 'file',                 // see Check Types below
  description: 'Why this matters for AI-readiness',
}
```

### Check Types

| Type        | Behavior                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `file`      | Exists as a file at any of `paths`                                                                       |
| `dir`       | Exists as a directory at any of `paths`                                                                  |
| `any`       | Exists as either file or directory                                                                       |
| `deep-scan` | Walks the file tree for `deepPattern` matches (requires `deepPattern` field)                             |
| `custom`    | Handled by the audit's `analyze()` function (requires `custom` field matching a key in analyze's return) |

### Weight Guidelines

| Weight | Meaning                  |
| ------ | ------------------------ |
| 1-2    | Nice to have             |
| 3-4    | Useful signal            |
| 5-7    | Important                |
| 8-10   | High impact              |
| 15-20  | Critical (use sparingly) |

## The `analyze()` Function

For checks with `type: 'custom'`, export an `analyze(rootDir, ctx)` function. It receives:

- **`rootDir`** — absolute path to the scanned repository
- **`ctx`** — utility object with: `existsSync`, `statSync`, `readFileSync`, `readFileSafe`, `readdirSync`, `join`, `relative`, `lineCount`, `dirItemCount`

Return an object where keys match the `custom` field of checks:

```js
export function analyze(rootDir, ctx) {
  return {
    'my-custom-check': {
      found: true, // required: did the check pass?
      detail: '3 items found', // optional: shown after ✔ in output
      matches: ['a', 'b'], // optional: shown as list
    },
  };
}
```

## Examples

### Simple audit (static checks only)

```js
export const section = 'Security';

export const checks = [
  {
    id: 'security-policy',
    label: 'SECURITY.md',
    section,
    weight: 3,
    paths: ['SECURITY.md', '.github/SECURITY.md'],
    type: 'file',
    description: 'Security policy for vulnerability reporting',
  },
  {
    id: 'codeowners',
    label: 'CODEOWNERS',
    section,
    weight: 2,
    paths: ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'],
    type: 'file',
    description: 'Code ownership rules for review enforcement',
  },
];
```

### Audit with custom analysis

See `references/mcp-audit-example.mjs` for a complete example with an `analyze()` function that parses file contents and returns quality signals.

### Deep-scan audit

```js
export const checks = [
  {
    id: 'todo-files',
    label: 'TODO.md files',
    section,
    weight: 2,
    paths: [],
    type: 'deep-scan',
    deepPattern: 'TODO.md',
    description: 'Per-directory TODO tracking files',
  },
];
```

## Workflow

1. Create `src/audits/{name}.mjs` — file name determines load order (alphabetical)
2. Export `section`, `checks`, and optionally `analyze()`
3. Run `node bin/cli.mjs --no-interactive .` to verify
4. The new section appears automatically in the report

## Rules

- **IDs must be unique** across all audit files
- **Section names must be unique** — one file per section
- Add the new section name to `SECTION_ORDER` in `src/scorer.mjs` so it appears in the correct position in the report
- Add a matching icon in `SECTION_ICONS` in `src/reporter.mjs`
- Keep audits focused — one concern per file
- No external dependencies — use only Node.js built-ins via `ctx`
- All checking must be offline and static (no network calls)
