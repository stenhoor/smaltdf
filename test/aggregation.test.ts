/**
 * Aggregation (DESIGN.md step 3) against REFERENCE.md "Aggregation", on row and columnar tables in process and
 * through the worker. Groups come in no particular order unless `maintainOrder` (decision A): those tests sort.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { col, len, lit, table } from '../src/index.js';
import { KINDS, type TableSpec, makeDb } from './helpers/db.js';

const ORDERS: TableSpec = {
  name: 'orders',
  columns: [['id', 'INTEGER'], ['region', 'TEXT'], ['qty', 'INTEGER'], ['price', 'REAL']],
  rows: [
    [1, 'north', 3, 2.5],
    [2, 'south', 12, 1.0],
    [3, 'north', null, 4.0],
    [4, 'east', null, null],
    [5, 'south', 12, 3.0],
    [6, 'north', 5, 1.5],
  ],
};

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});
const open = async (kind: (typeof KINDS)[number], tables: TableSpec[] = [ORDERS]) => {
  const d = await makeDb(kind, tables);
  closers.push(d.close);
  return d.db;
};
const byFirst = (rows: unknown[][]) => [...rows].sort((a, b) => String(a[0]).localeCompare(String(b[0])));

describe.each(KINDS)('%s', (kind) => {
  it('groupBy(…).agg(…): keys first, then each aggregate', async () => {
    const db = await open(kind);
    const r = await table('orders').groupBy('region').agg(col('qty').sum(), col('price').mean().alias('avg_price'), len()).collect(db);
    expect(r.columns).toEqual(['region', 'qty', 'avg_price', 'len']);
    expect(r.types).toEqual(['text', 'int', 'real', 'int']);
    expect(byFirst(r.rows)).toEqual([['east', 0, null, 1], ['north', 8, (2.5 + 4 + 1.5) / 3, 3], ['south', 24, 2, 2]]);
  });

  it('sum of no values is 0 (decision B); count is 0; mean, min, max are null', async () => {
    const db = await open(kind);
    const r = await table('orders').filter(col('region').eq('east')).select(col('qty').sum(), col('qty').count().alias('n'), col('qty').mean().alias('m'), col('qty').min().alias('lo'), col('qty').max().alias('hi')).collect(db);
    expect(r.rows).toEqual([[0, 0, null, null, null]]);
    const none = await table('orders').filter(col('id').gt(100)).select(col('price').sum(), len()).collect(db);
    expect(none.types).toEqual(['real', 'int']);
    expect(none.rows).toEqual([[0, 0]]);
  });

  it('a select of aggregates is one row over every row', async () => {
    const db = await open(kind);
    const r = await table('orders').select(col('qty').sum(), col('qty').max().alias('top'), col('price').median().alias('med'), len()).collect(db);
    expect(r.rows).toEqual([[32, 12, 2.5, 6]]);
  });

  it('expressions over aggregates, and over keys', async () => {
    const db = await open(kind);
    const r = await table('orders')
      .groupBy('region', { maintainOrder: true })
      .agg(col('qty').sum().div(len()).alias('per_row'), col('region').str.upper().alias('name'))
      .collect(db);
    expect(r.rows).toEqual([['north', 8 / 3, 'NORTH'], ['south', 12, 'SOUTH'], ['east', 0, 'EAST']]);
  });

  it('maintainOrder: groups in order of their first row (decision A)', async () => {
    const db = await open(kind);
    const r = await table('orders').groupBy('region', { maintainOrder: true }).agg(col('id').first(), col('id').last().alias('last')).collect(db);
    expect(r.rows).toEqual([['north', 1, 6], ['south', 2, 5], ['east', 4, 4]]);
  });

  it('keys may be expressions; std and var are the sample forms', async () => {
    const db = await open(kind);
    const r = await table('orders').groupBy(col('id').mod(2).alias('odd'), { maintainOrder: true }).agg(col('id').std().alias('sd'), col('id').var().alias('v')).collect(db);
    expect(r.columns).toEqual(['odd', 'sd', 'v']);
    expect(r.rows.map((x) => x[0])).toEqual([1, 0]);
    expect(r.rows[0]![2]).toBeCloseTo(4); // ids 1, 3, 5
    expect(r.rows[0]![1]).toBeCloseTo(2);
  });

  it('unique: one row per distinct value, keeping the first or last', async () => {
    const db = await open(kind);
    const first = await table('orders').unique({ subset: 'region', maintainOrder: true }).select('id', 'region').collect(db);
    expect(first.rows).toEqual([[1, 'north'], [2, 'south'], [4, 'east']]);
    const last = await table('orders').unique({ subset: ['region'], keep: 'last', maintainOrder: true }).select('id').collect(db);
    expect(last.rows.map((x) => x[0]).sort()).toEqual([4, 5, 6]);
    const all = await table('orders').select('qty').unique().collect(db);
    expect(all.rows.map((x) => x[0]).sort()).toEqual([12, 3, 5, null].sort());
  });

  it('errors name the method', async () => {
    const db = await open(kind);
    await expect(table('orders').withColumns(col('qty').sum()).collect(db)).rejects.toThrow(/withColumns: sum is an aggregate: use it in groupBy\(…\)\.agg\(…\)/);
    await expect(table('orders').select('region', col('qty').sum()).collect(db)).rejects.toThrow(/select: mixes aggregates and columns \(region\)/);
    await expect(table('orders').groupBy('region').agg(col('qty')).collect(db)).rejects.toThrow(/agg: no column "qty" in the groupBy keys/);
    await expect(table('orders').groupBy('region').agg(col('region').sum()).collect(db)).rejects.toThrow('agg: sum: takes numbers or durations, not text');
    await expect(table('orders').groupBy('nope').agg(len()).collect(db)).rejects.toThrow(/no column "nope"/);
    await expect(table('orders').unique({ subset: 'nope' }).collect(db)).rejects.toThrow(/unique: no column "nope"/);
    await expect(table('orders').select(col('qty').sum().sum()).collect(db)).rejects.toThrow(/sum is an aggregate/);
    await expect(table('orders').groupBy('region').agg(col('qty').sum(), col('price').sum().alias('qty')).collect(db)).rejects.toThrow(/two columns named "qty"/);
  });

  it('sum of integers that overflows is an error, as arithmetic is', async () => {
    const db = await open(kind, [{ name: 'big', columns: [['a', 'INTEGER']], rows: [[9223372036854775807n], [1]] }]);
    await expect(table('big').select(col('a').sum()).collect(db)).rejects.toThrow(/overflow/);
  });
});

it('maintainOrder asks the engine for order, and its absence leaves the engine free (decision A)', async () => {
  const d = await makeDb('in process (row)', [ORDERS]);
  closers.push(d.close);
  const ops = (x: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] => {
    if (x && typeof x === 'object') {
      if ('op' in x) out.push(x as Record<string, unknown>);
      for (const v of Object.values(x)) ops(v, out);
    }
    return out;
  };
  const ordered = async (f: ReturnType<typeof table>, op: string) => ops(await f.plan(d.db)).filter((o) => o.op === op).map((o) => o.ordered ?? null);
  expect(await ordered(table('orders').groupBy('region', { maintainOrder: true }).agg(len()), 'aggregate')).toEqual(['first']);
  expect(await ordered(table('orders').groupBy('region').agg(len()), 'aggregate')).toEqual([null]);
  expect(await ordered(table('orders').unique({ maintainOrder: true }), 'distinct')).toEqual(['first']);
  expect(await ordered(table('orders').unique(), 'distinct')).toEqual([null]);
});

it('a literal in a select of aggregates is allowed', async () => {
  const d = await makeDb('in process (row)', [ORDERS]);
  closers.push(d.close);
  expect((await table('orders').select(len(), lit(1).alias('one')).collect(d.db)).rows).toEqual([[6, 1]]);
});
