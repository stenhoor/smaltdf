// Known differences from Polars (docs/divergences.md). smaltdf follows smaltdb's semantics where an operation maps
// onto a SQL operator or function (owner's decision, docs/DESIGN.md #5). Each entry pins both results: if smaltdb or
// Polars changes, this test says so, and the entry (and the doc) must be updated or removed.
import { Database } from 'smaltdb/engine';
import { describe, expect, test } from 'vitest';
import { smaltdf } from '../src/index.js';
import { BACKENDS, backend } from './backends.js';
import { run, type Case, type FrameSpec, type Op } from './differential/interpret.js';
import { havePolars, runPolars } from './differential/polars.js';

const data: FrameSpec = {
  columns: { a: [7, -7, null, 2], b: [2, 2, 1, 0], f: [2.5, -2.5, 0.125, null], s: ['3', 'x', null, '4'] },
  schema: { a: 'Int64', b: 'Int64', f: 'Float64', s: 'String' },
};

const sel = (name: string, e: unknown): Op => ({ op: 'select', args: [{ call: 'alias', on: e, args: [name] }] });

/** 2^62 (exact as a double): doubling it overflows a 64-bit integer. */
const big: FrameSpec = { columns: { i: [2 ** 62, 1] }, schema: { i: 'Int64' } };

interface Divergence {
  id: string;
  frame?: FrameSpec;
  ops: Op[];
  smaltdf: unknown[][] | { error: RegExp };
  polars: unknown[][] | { error: RegExp };
}

const DIVERGENCES: Divergence[] = [
  { id: 'integer-division', ops: [sel('q', { call: 'truediv', on: { col: 'a' }, args: [{ col: 'b' }] })], smaltdf: [[3], [-3], [null], [null]], polars: [[3.5], [-3.5], [null], ['inf']] },
  { id: 'modulo-sign', ops: [sel('m', { call: 'mod', on: { col: 'a' }, args: [{ col: 'b' }] })], smaltdf: [[1], [-1], [null], [null]], polars: [[1], [1], [null], [null]] },
  { id: 'round-half', ops: [sel('r', { call: 'round', on: { col: 'f' }, args: [0] })], smaltdf: [[3], [-3], [0], [null]], polars: [[2], [-2], [0], [null]] },
  { id: 'round-half', ops: [sel('r', { call: 'round', on: { col: 'f' }, args: [2] })], smaltdf: [[2.5], [-2.5], [0.13], [null]], polars: [[2.5], [-2.5], [0.12], [null]] },
  { id: 'sum-of-nothing', ops: [{ op: 'filter', args: [{ call: 'gt', on: { col: 'a' }, args: [{ lit: 100 }] }] }, sel('s', { call: 'sum', on: { col: 'a' } })], smaltdf: [[null]], polars: [[0]] },
  { id: 'sort-nulls-default', ops: [{ op: 'sort', args: ['a'], kwargs: { descending: true } }, { op: 'select', args: ['a'] }], smaltdf: [[7], [2], [-7], [null]], polars: [[null], [7], [2], [-7]] },
  { id: 'cast-text-to-number', ops: [sel('n', { call: 'cast', on: { col: 's' }, args: [{ dtype: 'Int64' }] })], smaltdf: [[3], [0], [null], [4]], polars: { error: /InvalidOperationError/ } },
  { id: 'nan-is-null', ops: [sel('r', { call: 'sqrt', on: { col: 'a' } })], smaltdf: [[Math.sqrt(7)], [null], [null], [Math.SQRT2]], polars: [[Math.sqrt(7)], ['nan'], [null], [Math.SQRT2]] },
  { id: 'nan-is-null', ops: [sel('r', { call: 'log', on: { col: 'b' } })], smaltdf: [[Math.LN2], [Math.LN2], [0], [null]], polars: [[Math.LN2], [Math.LN2], [0], ['-inf']] },
  { id: 'nan-is-null', frame: { columns: { c: [2, 2, 2] }, schema: { c: 'Int64' } }, ops: [sel('k', { call: 'skew', on: { col: 'c' } })], smaltdf: [[null]], polars: [['nan']] },
  { id: 'float-division-by-zero', ops: [sel('q', { call: 'truediv', on: { col: 'f' }, args: [{ lit: 0.0 }] })], smaltdf: [[null], [null], [null], [null]], polars: [['inf'], ['-inf'], ['inf'], [null]] },
  { id: 'integer-overflow', frame: big, ops: [sel('x', { call: 'mul', on: { col: 'i' }, args: [{ lit: 2 }] })], smaltdf: [[2 ** 63], [2]], polars: [[-(2 ** 63)], [2]] },
  { id: 'integer-overflow', frame: { columns: { i: [2 ** 62, 2 ** 62] }, schema: { i: 'Int64' } }, ops: [sel('s', { call: 'sum', on: { col: 'i' } })], smaltdf: { error: /integer overflow/ }, polars: [[-(2 ** 63)]] },
  { id: 'unsigned-lengths', ops: [sel('n', { call: 'sub', on: { call: 'str.len_chars', on: { col: 's' } }, args: [{ lit: 2 }] })], smaltdf: [[-1], [-1], [null], [-1]], polars: [[4294967295], [4294967295], [null], [4294967295]] },
];

const cases: Case[] = DIVERGENCES.map((d, i) => ({ name: `${d.id}-${i}`, data: d.frame ?? data, ops: d.ops, ordered: true }));

async function smaltdfResult(p: Parameters<typeof run>[0], c: Case, load?: Parameters<typeof run>[2]): Promise<unknown> {
  try {
    return (await run(p, c, load)).rows;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

function expectResult(got: unknown, want: Divergence['smaltdf'], label: string): void {
  if ('error' in want) expect((got as { error?: string }).error, label).toMatch(want.error);
  else expect(got, label).toEqual(want);
}

describe('known divergences from Polars', () => {
  test.each(DIVERGENCES.map((d, i) => [d.id, i] as const))('%s: smaltdf gives smaltdb\'s result', async (_id, i) => {
    expectResult(await smaltdfResult(smaltdf(Database.openMemory()), cases[i]), DIVERGENCES[i].smaltdf, DIVERGENCES[i].id);
  });

  test.each(BACKENDS)('the same results on %s', async (name) => {
    const b = await backend(name);
    try {
      for (let i = 0; i < cases.length; i++) {
        expectResult(await smaltdfResult(b.pl, cases[i], (spec) => b.load(spec)), DIVERGENCES[i].smaltdf, `${DIVERGENCES[i].id} (#${i})`);
      }
    } finally {
      await b.close();
    }
  });

  describe.skipIf(!havePolars())('and Polars still differs', () => {
    const results = runPolars(cases);
    test.each(DIVERGENCES.map((d, i) => [d.id, i] as const))('%s', (_id, i) => {
      const want = DIVERGENCES[i].polars;
      const res = results[cases[i].name];
      if ('error' in want) expect('error' in res && res.error).toMatch(want.error);
      else expect('rows' in res && res.rows).toEqual(want);
    });
  });
});
