/**
 * Polars comparison tests (DESIGN.md step 9, owner's decision D): each case in cases.ts runs as a smaltdf frame and as
 * Polars, over the same tables, and the results (columns, types, rows, or an error) are compared. A case is the same
 * unless it says how the two differ, and then it must differ. The differences are written into docs/REFERENCE.md
 * ("Compared with Polars"): this test fails if that section is not what the cases give, and `UPDATE=1` rewrites it.
 *
 * Not part of `npm run check`: it needs Python with the Polars of compare/requirements.txt (`PYTHON`, default
 * python3). Run it with `npm run compare`.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/frame.js';
import { makeDb } from '../test/helpers/db.js';
import { CASES, type Case, TABLES } from './cases.js';

interface Result {
  readonly columns?: readonly string[];
  readonly types?: readonly string[];
  readonly rows?: readonly (readonly unknown[])[];
  readonly error?: string;
}

const STORAGE = { int: 'INTEGER', real: 'REAL', text: 'TEXT', date: 'DATE', datetime: 'DATETIME' } as const;
const REFERENCE = fileURLToPath(new URL('../docs/REFERENCE.md', import.meta.url));
const BEGIN = '<!-- compare:begin (written by compare/compare.test.ts: npm run compare with UPDATE=1) -->';
const END = '<!-- compare:end -->';

/** A value as JSON: big integers and non-finite reals tagged, as run_polars.py gives them. */
function json(v: unknown): unknown {
  if (typeof v === 'bigint') return v >= -(2n ** 53n) && v <= 2n ** 53n ? Number(v) : { $int: v.toString() };
  if (typeof v === 'number' && !Number.isFinite(v)) return { $real: Number.isNaN(v) ? 'nan' : v > 0 ? 'inf' : '-inf' };
  // A datetime: collect gives a JS Date (ms).
  if (v instanceof Date) return { $datetime: v.toISOString().slice(0, 23) };
  return v;
}

function same(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= 1e-12 * Math.max(Math.abs(a), Math.abs(b));
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Whether two results agree: both errors, or the same columns, types and rows (as a multiset when unordered). */
function agree(c: Case, a: Result, b: Result): boolean {
  if (a.error || b.error) return Boolean(a.error && b.error);
  if (!same(a.columns, b.columns) || !same(a.types, b.types) || a.rows!.length !== b.rows!.length) return false;
  const key = (r: readonly unknown[]) => JSON.stringify(r);
  const [x, y] = c.ordered === false ? [[...a.rows!].sort((p, q) => key(p).localeCompare(key(q))), [...b.rows!].sort((p, q) => key(p).localeCompare(key(q)))] : [a.rows!, b.rows!];
  return x.every((r, i) => r.length === y[i]!.length && r.every((v, j) => same(v, y[i]![j])));
}

const show = (r: Result) => (r.error ? `error (${r.error})` : `${JSON.stringify(r.columns)} ${JSON.stringify(r.types)} ${JSON.stringify(r.rows)}`);

/** The reference's section for these cases. */
function section(version: string): string {
  const differ = CASES.filter((c) => c.differs);
  const agreeing = [...new Set(CASES.filter((c) => !c.differs).map((c) => `\`${c.fn}\``))];
  return [
    BEGIN,
    '',
    `With Polars ${version}, ${CASES.length - differ.length} of the ${CASES.length} cases give the same columns, types and rows (or both an`,
    `error). They cover ${agreeing.join(', ')}.`,
    '',
    'These differ:',
    '',
    '| Function | Difference |',
    '|---|---|',
    ...differ.map((c) => `| \`${c.fn}\` | ${c.differs} |`),
    '',
    END,
  ].join('\n');
}

let db: Db;
let close: () => Promise<void>;
let polars: { version: string; results: Record<string, Result> };
const ours: Record<string, Result> = {};

beforeAll(async () => {
  const tables = Object.entries(TABLES).map(([name, t]) => ({ name, columns: t.columns.map(([c, ty]) => [c, STORAGE[ty]] as [string, (typeof STORAGE)[keyof typeof STORAGE]]), rows: t.rows }));
  ({ db, close } = await makeDb('in process (row)', tables));
  for (const c of CASES) {
    try {
      const r = await c.df.collect(db);
      ours[c.id] = { columns: r.columns, types: r.types, rows: r.rows.map((row) => row.map(json)) };
    } catch (err) {
      ours[c.id] = { error: (err as Error).message };
    }
  }
  const input = JSON.stringify({ tables: TABLES, cases: CASES.map((c) => ({ id: c.id, polars: c.polars })) }, (_k, v) => json(v));
  const run = spawnSync(process.env.PYTHON ?? 'python3', [fileURLToPath(new URL('./run_polars.py', import.meta.url))], { input, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (run.status !== 0) throw new Error(`run_polars.py failed: ${run.error?.message ?? run.stderr}`);
  polars = JSON.parse(run.stdout) as typeof polars;
});
afterAll(() => close?.());

it('case ids are unique', () => {
  expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
});

describe.each(CASES.map((c) => [c.id, c] as const))('%s', (_id, c) => {
  it(c.differs ? 'differs as documented' : 'gives what Polars gives', () => {
    const a = ours[c.id]!;
    const b = polars.results[c.id]!;
    const detail = `\n  smaltdf: ${show(a)}\n  Polars:  ${show(b)}`;
    // SHOW=1 prints both results of every case.
    if (process.env.SHOW) console.log(c.id, detail);
    if (c.differs) expect(agree(c, a, b), `documented as different, but they agree:${detail}`).toBe(false);
    else expect(agree(c, a, b), `they differ:${detail}`).toBe(true);
  });
});

it('the reference lists the differences', () => {
  const text = readFileSync(REFERENCE, 'utf8');
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  expect(start, 'docs/REFERENCE.md has no compare section').toBeGreaterThanOrEqual(0);
  const now = text.slice(start, end + END.length);
  const want = section(polars.version);
  if (process.env.UPDATE && now !== want) writeFileSync(REFERENCE, text.slice(0, start) + want + text.slice(end + END.length));
  else expect(now, 'run npm run compare with UPDATE=1').toBe(want);
});
