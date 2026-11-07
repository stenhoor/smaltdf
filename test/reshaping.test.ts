/**
 * Reshaping and data from JavaScript (DESIGN.md step 6) against REFERENCE.md "Reshaping" and "Data from JavaScript",
 * on row and columnar tables in process and through the worker.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { col, frame, table } from '../src/index.js';
import { KINDS, type TableSpec, makeDb } from './helpers/db.js';

const SCORES: TableSpec = {
  name: 'scores',
  columns: [['name', 'TEXT'], ['subject', 'TEXT'], ['score', 'INTEGER']],
  rows: [['ann', 'math', 90], ['bo', 'math', 70], ['ann', 'art', 80], ['bo', 'art', null], ['ann', 'math', 10], ['cy', 'music', 50]],
};
const WIDE: TableSpec = { name: 'wide', columns: [['id', 'INTEGER'], ['q1', 'INTEGER'], ['q2', 'INTEGER']], rows: [[1, 10, 20], [2, null, 40]] };

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});
const open = async (kind: (typeof KINDS)[number]) => {
  const d = await makeDb(kind, [SCORES, WIDE]);
  closers.push(d.close);
  return d.db;
};

describe.each(KINDS)('%s', (kind) => {
  it('frame: rows from arrays and typed arrays, with their types', async () => {
    const db = await open(kind);
    const r = await frame({ a: new Int32Array([1, 2, 3]), b: [1.5, null, 3], c: ['x', 'y', null], d: [true, false, null], e: [1n, 2, 9007199254740993n] }).collect(db);
    expect(r.types).toEqual(['int', 'real', 'text', 'bool', 'int']);
    expect(r.rows).toEqual([[1, 1.5, 'x', true, 1], [2, null, 'y', false, 2], [3, 3, null, null, 9007199254740993n]]);
    const f = await frame({ x: new Float64Array([1, Number.NaN, 2.5]) }).filter(col('x').gt(1)).collect(db);
    expect(f.rows).toEqual([[2.5]]);
  });

  it('frame: joins tables and runs every method', async () => {
    const db = await open(kind);
    const r = await frame({ name: ['ann', 'cy'], bonus: [5, 7] }).join(table('scores'), { on: 'name' }).groupBy('name', { maintainOrder: true }).agg(col('score').sum(), col('bonus').first()).collect(db);
    expect(r.rows).toEqual([['ann', 180, 5], ['cy', 50, 7]]);
  });

  it('unpivot: a row per column, in input order then column order', async () => {
    const db = await open(kind);
    const r = await table('wide').unpivot({ index: 'id' }).collect(db);
    expect(r.columns).toEqual(['id', 'variable', 'value']);
    expect(r.types).toEqual(['int', 'text', 'int']);
    expect(r.rows).toEqual([[1, 'q1', 10], [1, 'q2', 20], [2, 'q1', null], [2, 'q2', 40]]);
    const named = await table('wide').unpivot({ on: ['q2'], index: ['id'], variableName: 'quarter', valueName: 'n' }).collect(db);
    expect(named.columns).toEqual(['id', 'quarter', 'n']);
    expect(named.rows).toEqual([[1, 'q2', 20], [2, 'q2', 40]]);
  });

  it('pivot: one column per value of on, read first when not given; cells aggregate', async () => {
    const db = await open(kind);
    const r = await table('scores').pivot('subject', { index: 'name', values: 'score', aggregate: 'sum', maintainOrder: true }).collect(db);
    expect(r.columns).toEqual(['name', 'art', 'math', 'music']);
    // sum of no values is 0 (decision B): bo has no music, and an art score that is null.
    expect(r.rows).toEqual([['ann', 80, 100, 0], ['bo', 0, 70, 0], ['cy', 0, 0, 50]]);
    const given = await table('scores').pivot('subject', { index: 'name', values: 'score', columns: ['math', 'art'], maintainOrder: true }).collect(db);
    expect(given.columns).toEqual(['name', 'math', 'art']);
    expect(given.rows).toEqual([['ann', 90, 80], ['bo', 70, null], ['cy', null, null]]);
    // The values are read from the frame as it is at the pivot: after the filter.
    const after = await table('scores').filter(col('subject').ne('music')).pivot('subject', { index: 'name', values: 'score', aggregate: 'len' }).collect(db);
    expect(after.columns).toEqual(['name', 'art', 'math']);
  });

  it('sample: n distinct rows in their order, the same for a seed; or with replacement', async () => {
    const db = await open(kind);
    const ids = async (o: Parameters<ReturnType<typeof table>['sample']>[0]) => (await table('scores').withColumns(col('score').alias('s')).sample(o).select('name', 'subject').collect(db)).rows.map((x) => `${x[0]}/${x[1]}`);
    const a = await ids({ n: 3, seed: 7 });
    expect(a).toHaveLength(3);
    expect(await ids({ n: 3, seed: 7 })).toEqual(a);
    const all = ['ann/math', 'bo/math', 'ann/art', 'bo/art', 'ann/math', 'cy/music'];
    // Distinct rows keep their input order.
    expect(a.map((x) => all.indexOf(x))).toEqual([...a.map((x) => all.indexOf(x))].sort((x, y) => x - y));
    expect(await ids({ n: 10, seed: 1 })).toHaveLength(6);
    expect(await ids({ n: 10, seed: 1, withReplacement: true })).toHaveLength(10);
    expect((await ids({ fraction: 0.5, seed: 3 })).length).toBeGreaterThan(0);
  });

  it('errors name the method', async () => {
    const db = await open(kind);
    expect(() => frame({ a: [1, 2], b: [1] })).toThrow('frame: column b has 1 values, not 2');
    expect(() => frame({ a: [1, 'x'] })).toThrow('frame: column a mixes number and string');
    expect(() => frame({})).toThrow(/no columns/);
    expect(() => table('scores').sample({})).toThrow(/give n or fraction/);
    expect(() => table('scores').sample({ fraction: 2 })).toThrow(/between 0 and 1/);
    await expect(table('wide').unpivot({ on: 'nope' }).collect(db)).rejects.toThrow(/unpivot: no column "nope"/);
    await expect(table('scores').pivot('subject', { index: [], values: 'score' }).collect(db)).rejects.toThrow(/pivot: give index/);
    await expect(table('scores').pivot('subject', { index: 'name', values: 'nope' }).collect(db)).rejects.toThrow(/pivot: no column "nope"/);
  });
});

it('a frame is not a promise: await gives the frame back', async () => {
  const f = table('scores');
  expect(await f).toBe(f);
});
