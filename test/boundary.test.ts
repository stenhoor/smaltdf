/**
 * The rule that comes first (CLAUDE.md): no code in smaltdf generates, compiles to, or runs SQL. smaltdf's source
 * reaches smaltdb only through the plan layer (`smaltdb/plan`, at run time) and types, and holds no SQL text.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const src = join(import.meta.dirname, '..', 'src');
const files = readdirSync(src).filter((f) => f.endsWith('.ts')).map((f) => ({ f, text: readFileSync(join(src, f), 'utf8') }));

it('imports nothing of smaltdb at run time but smaltdb/plan', () => {
  for (const { f, text } of files) {
    for (const m of text.matchAll(/^import\s+(type\s+)?[^;]*?from\s+'([^']+)'/gms)) {
      const [, typeOnly, spec] = m;
      if (spec!.startsWith('./')) continue;
      if (typeOnly) expect(spec, f).toMatch(/^smaltdb(\/plan|\/engine|\/language)?$/);
      else expect(spec, `${f} imports ${spec} at run time`).toBe('smaltdb/plan');
    }
  }
});

/** `text` without its comments: they may name what smaltdf is not; the code may not contain it. */
const code = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

it('holds no SQL text and calls no text API', () => {
  for (const { f, text: all } of files) {
    const text = code(all);
    // A statement keyword followed by more of a statement: `'select'` alone is smaltdf's own method name.
    expect(text, f).not.toMatch(/['"`]\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|BEGIN|PRAGMA)\s+[^'"`\s]/i);
    expect(text, f).not.toMatch(/\.(exec|query|prepare|run)\(\s*['"`]/);
  }
});
