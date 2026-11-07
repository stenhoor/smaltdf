/**
 * bool and NaN from the engine (smaltdb ADR 0018): comparisons and logic are the engine's bool, a bool column of a
 * table smaltdf makes is BOOLEAN and reads back as bool, and NaN is a value of real (0 / 0, from JavaScript data) that
 * sorts after every number and equals itself; on row and columnar tables, in process and through the worker.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { col, frame, lit, table } from '../src/index.js';
import { KINDS, makeDb } from './helpers/db.js';

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});

describe.each(KINDS)('%s', (kind) => {
  const open = async () => {
    const d = await makeDb(kind, []);
    closers.push(d.close);
    return d.db;
  };

  it('0 / 0 is NaN, and NaN sorts after every number and equals itself', async () => {
    const db = await open();
    const x = frame({ x: new Float64Array([2, Number.NaN, Number.POSITIVE_INFINITY, 1]) });
    expect((await x.select(col('x').div(0).alias('q')).collect(db)).rows.map((r) => r[0])).toEqual([Infinity, Number.NaN, Infinity, Infinity]);
    expect((await frame({ a: [0] }).select(col('a').div(lit(0))).collect(db)).rows).toEqual([[Number.NaN]]);
    expect((await x.sort('x').collect(db)).rows.map((r) => r[0])).toEqual([1, 2, Infinity, Number.NaN]);
    expect((await x.filter(col('x').eq(lit(Number.NaN))).collect(db)).rows).toEqual([[Number.NaN]]);
  });

  it('a bool column is stored as BOOLEAN, filtered by and inserted into', async () => {
    const db = await open();
    await frame({ id: [1, 2, 3], ok: [true, false, null] }).createTable(db, 'flags');
    const all = await table('flags').sort('id').collect(db);
    expect(all.types).toEqual(['int', 'bool']);
    expect(all.rows).toEqual([[1, true], [2, false], [3, null]]);
    expect((await table('flags').filter(col('ok')).select('id').collect(db)).rows).toEqual([[1]]);
    expect(await frame({ id: [4], ok: [true] }).insertInto(db, 'flags')).toEqual({ rows: 1 });
    expect((await table('flags').filter(col('ok').and(col('id').gt(1))).select('id').collect(db)).rows).toEqual([[4]]);
    await expect(frame({ id: [5], ok: [2] }).insertInto(db, 'flags')).rejects.toThrow(/ok is int, and flags.ok holds BOOLEAN/);
  });
});
