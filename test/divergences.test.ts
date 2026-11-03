// Known differences from Polars (docs/divergences.md). smaltdf follows smaltdb's semantics where an operation maps
// onto a SQL operator or function (owner's decision, docs/DESIGN.md #5). Each entry pins both results: if smaltdb or
// Polars changes, this test says so, and the entry (and the doc) must be updated or removed.
import { Database } from 'smaltdb/engine';
import { describe, expect, test } from 'vitest';
import { smaltdf } from '../src/index.js';
import { run, type Case, type FrameSpec, type Op } from './differential/interpret.js';
import { havePolars, runPolars } from './differential/polars.js';

const data: FrameSpec = {
  columns: { a: [7, -7, null, 2], b: [2, 2, 1, 0], f: [2.5, -2.5, 0.125, null], s: ['3', 'x', null, '4'] },
  schema: { a: 'Int64', b: 'Int64', f: 'Float64', s: 'String' },
};

const sel = (name: string, e: unknown): Op => ({ op: 'select', args: [{ call: 'alias', on: e, args: [name] }] });

interface Divergence {
  id: string;
  ops: Op[];
  smaltdf: unknown[][];
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
  { id: 'unsigned-lengths', ops: [sel('n', { call: 'sub', on: { call: 'str.len_chars', on: { col: 's' } }, args: [{ lit: 2 }] })], smaltdf: [[-1], [-1], [null], [-1]], polars: [[4294967295], [4294967295], [null], [4294967295]] },
];

const cases: Case[] = DIVERGENCES.map((d, i) => ({ name: `${d.id}-${i}`, data, ops: d.ops, ordered: true }));

describe('known divergences from Polars', () => {
  test.each(DIVERGENCES.map((d, i) => [d.id, i] as const))('%s: smaltdf gives smaltdb\'s result', async (_id, i) => {
    const got = await run(smaltdf(Database.openMemory()), cases[i]);
    expect(got.rows).toEqual(DIVERGENCES[i].smaltdf);
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
