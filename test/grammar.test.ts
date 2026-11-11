/**
 * smaltdf's grammar (docs/grammar.ebnf) against the source: it names every exported function and every public method
 * of Frame, GroupBy and Expr (the `str`, `dt` and `list` methods as `str-…`, `dt-…` and `list-…`, `struct.field` as
 * `struct-field`), and each reference page draws the rule of its method. The syntax diagrams and the agent guide read
 * the grammar, so a method added without a rule, or a rule left after its method went, fails here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as df from '../src/index.js';

const grammar = readFileSync('docs/grammar.ebnf', 'utf8');
const rules = new Set([...grammar.matchAll(/^[ \t]*([A-Za-z][\w-]*)\s*::=/gm)].map((m) => m[1]));

/** Methods that are internal, not part of the language. */
const INTERNAL = new Set(['constructor', 'source', 'resolved', 'withStep', 'build', 'buildOp', 'buildRoot', 'op', 'window', 'aggregate']);
/** Namespaces of Expr: their methods' rules carry the namespace as a prefix. */
const NAMESPACES = ['str', 'dt', 'list', 'struct'];

const own = (o: object): string[] => Object.getOwnPropertyNames(o).filter((n) => !INTERNAL.has(n));

/** Every name of the language, as its grammar rule names it. */
function languageRules(): string[] {
  const out = new Set<string>();
  for (const n of own(df.Frame.prototype)) out.add(n);
  for (const n of own(df.GroupBy.prototype)) out.add(n);
  const x = df.col('x');
  for (const n of own(df.Expr.prototype)) {
    if (NAMESPACES.includes(n)) for (const m of Object.keys((x as unknown as Record<string, object>)[n])) out.add(`${n}-${m}`);
    else out.add(n);
  }
  // Exported functions and values; `frame` is the rule `frame-data` (the rule `frame` is a whole chain).
  const fns: Record<string, string> = { table: 'table', frame: 'frame-data', concat: 'concat', col: 'col', lit: 'lit', len: 'len', update: 'update', deleteFrom: 'deleteFrom', refreshView: 'refreshView', dfLanguage: 'dfLanguage' };
  for (const name of Object.keys(df)) {
    if (['Frame', 'GroupBy', 'Expr', 'Write', 'DfError'].includes(name)) continue;
    expect(fns[name], `export ${name} has no grammar rule name here`).toBeDefined();
    out.add(fns[name]!);
  }
  return [...out].sort();
}

describe('the grammar', () => {
  it('names every function and method of the language', () => {
    const missing = languageRules().filter((r) => !rules.has(r));
    expect(missing, `methods without a rule in docs/grammar.ebnf`).toEqual([]);
  });

  it('names no method the language lacks', () => {
    const lang = new Set(languageRules());
    // A rule that looks like a method's name (camelCase or a namespace prefix) must be one; the others are helpers.
    const methodLike = [...rules].filter((r) => (/^(str|dt|list|struct)-/.test(r) && !r.endsWith('-method')) || (/^[a-z][A-Za-z]*$/.test(r) && !HELPERS.has(r)));
    expect(methodLike.filter((r) => !lang.has(r)), 'rules for methods that do not exist').toEqual([]);
  });

  it('every reference page draws its method\'s rule', () => {
    const pages: string[] = [];
    const walk = (d: string): void => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (e.endsWith('.md') && e !== 'index.md') pages.push(p);
      }
    };
    for (const e of readdirSync('docs/reference')) if (statSync(join('docs/reference', e)).isDirectory()) walk(join('docs/reference', e));
    const drawn = new Set<string>();
    for (const page of pages) {
      const fences = [...readFileSync(page, 'utf8').matchAll(/```railroad\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n').map((l) => l.trim()).filter(Boolean));
      expect(fences.length, `${page} has no syntax diagram`).toBeGreaterThan(0);
      for (const r of fences) {
        expect(rules.has(r), `${page} draws ${r}, which the grammar doesn't define`).toBe(true);
        drawn.add(r);
      }
    }
    const lang = languageRules();
    expect(lang.filter((r) => !drawn.has(r) && r !== 'agg'), 'methods without a reference page').toEqual([]);
  });
});

/** Rules that are parts of the grammar, not methods. */
const HELPERS = new Set(['frame', 'source', 'column', 'names', 'expr', 'arithmetic', 'comparison', 'logic', 'aggregate', 'every', 'zone']);
