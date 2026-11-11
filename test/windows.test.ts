/**
 * Windows (DESIGN.md step 5) against the reference (docs/reference/), on row and columnar tables in process and through the
 * worker. Window results never move rows: each test reads them in the frame's own order.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { col, len, table } from '../src/index.js';
import { KINDS, type TableSpec, makeDb } from './helpers/db.js';

// Rows deliberately not in t order: windows ordered by t must not reorder them.
const SALES: TableSpec = {
  name: 'sales',
  columns: [['id', 'INTEGER'], ['shop', 'TEXT'], ['t', 'INTEGER'], ['amt', 'INTEGER']],
  rows: [
    [1, 'a', 3, 10],
    [2, 'b', 1, 5],
    [3, 'a', 1, 20],
    [4, 'b', 2, null],
    [5, 'a', 2, 10],
    [6, 'b', 3, 7],
  ],
};

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});
const open = async (kind: (typeof KINDS)[number]) => {
  const d = await makeDb(kind, [SALES]);
  closers.push(d.close);
  return d.db;
};

describe.each(KINDS)('%s', (kind) => {
  it('an aggregate over partitions: each row gets its partition value; rows stay in place', async () => {
    const db = await open(kind);
    const r = await table('sales').select('id', col('amt').sum().over('shop').alias('shop_total'), len().over('shop').alias('n'), col('amt').mean().over().alias('all_mean')).collect(db);
    expect(r.rows).toEqual([
      [1, 40, 3, 52 / 5],
      [2, 12, 3, 52 / 5],
      [3, 40, 3, 52 / 5],
      [4, 12, 3, 52 / 5],
      [5, 40, 3, 52 / 5],
      [6, 12, 3, 52 / 5],
    ]);
  });

  it('cumulative functions in the frame order, or over an order; null where the value is null', async () => {
    const db = await open(kind);
    const plain = await table('sales').select('id', col('amt').cumSum().alias('cs'), col('amt').cumCount().alias('cc'), col('amt').cumMax().alias('cm')).collect(db);
    expect(plain.rows).toEqual([[1, 10, 1, 10], [2, 15, 2, 10], [3, 35, 3, 20], [4, null, 3, null], [5, 45, 4, 20], [6, 52, 5, 20]]);
    const byTime = await table('sales').withColumns(col('amt').cumSum().over('shop', { orderBy: 't' }).alias('running')).select('id', 'running').collect(db);
    // shop a by t: 3 (20), 5 (10), 1 (10); shop b by t: 2 (5), 4 (null), 6 (7).
    expect(byTime.rows).toEqual([[1, 40], [2, 5], [3, 20], [4, null], [5, 30], [6, 12]]);
  });

  it('shift: the value n rows before (after for negative n), or fill', async () => {
    const db = await open(kind);
    const r = await table('sales').select('id', col('id').shift().alias('prev'), col('id').shift(-2, 0).alias('next2'), col('amt').shift(1).over('shop', { orderBy: 't' }).alias('prev_in_shop')).collect(db);
    expect(r.rows).toEqual([[1, null, 3, 10], [2, 1, 4, null], [3, 2, 5, null], [4, 3, 6, 5], [5, 4, 0, 20], [6, 5, 0, null]]);
  });

  it('rank: min, dense and ordinal; descending; nulls rank null; per partition', async () => {
    const db = await open(kind);
    const r = await table('sales').select('id', col('amt').rank().alias('min'), col('amt').rank({ method: 'dense' }).alias('dense'), col('amt').rank({ method: 'ordinal' }).alias('ord'), col('amt').rank({ descending: true }).over('shop').alias('in_shop')).collect(db);
    // amt: 10, 5, 20, null, 10, 7 -> 5 < 7 < 10 = 10 < 20.
    expect(r.rows.map((x) => x.slice(0, 4))).toEqual([[1, 3, 3, 3], [2, 1, 1, 1], [3, 5, 4, 5], [4, null, null, null], [5, 3, 3, 4], [6, 2, 2, 2]]);
    // Per shop, descending: a has 10, 20, 10 (ranks 2, 1, 2); b has 5, null, 7 (2, null, 1).
    expect(r.rows.map((x) => x[4])).toEqual([2, 2, 1, null, 2, 1]);
  });

  it('filter by a window: the top row of each partition', async () => {
    const db = await open(kind);
    const r = await table('sales').filter(col('amt').rank({ method: 'ordinal', descending: true }).over('shop').eq(1)).collect(db);
    expect(r.columns).toEqual(['id', 'shop', 't', 'amt']);
    expect(r.rows).toEqual([[3, 'a', 1, 20], [6, 'b', 3, 7]]);
  });

  it('errors name the method', async () => {
    const db = await open(kind);
    await expect(table('sales').withColumns(col('amt').sum()).collect(db)).rejects.toThrow(/or per row with \.over\(…\)/);
    await expect(table('sales').select(col('amt').sum().add(1).over('shop')).collect(db)).rejects.toThrow(/over applies to one aggregate or window function/);
    await expect(table('sales').select(col('amt').rank().over('shop', { orderBy: 't' })).collect(db)).rejects.toThrow(/rank orders by its own value/);
    await expect(table('sales').groupBy('shop').agg(col('amt').cumSum()).collect(db)).rejects.toThrow(/cumSum is a window: use it in select, withColumns or filter/);
    await expect(table('sales').select(col('shop').cumSum()).collect(db)).rejects.toThrow('select: cumSum: takes numbers, not text');
    await expect(table('sales').select(col('amt').sum().over('nope')).collect(db)).rejects.toThrow(/no column "nope"/);
  });
});

it('windows that share a partition, order and frame share one engine window; an ordered one keeps rows in place', async () => {
  const d = await makeDb('in process (row)', [SALES]);
  closers.push(d.close);
  const ops = (x: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] => {
    if (x && typeof x === 'object') {
      if ('op' in x) out.push(x as Record<string, unknown>);
      for (const v of Object.values(x)) ops(v, out);
    }
    return out;
  };
  const plan = await table('sales').select(col('amt').sum().over('shop'), col('amt').max().over('shop').alias('m'), col('amt').cumSum().over('shop', { orderBy: 't' }).alias('c')).plan(d.db);
  const kinds = ops(plan).map((o) => o.op);
  // One window numbers the rows; one holds sum and max over shop; one the ordered running sum; a sort puts rows back.
  expect(kinds.filter((k) => k === 'window').length).toBe(3);
  expect(kinds).toContain('sort');
  const unordered = await table('sales').select(col('amt').sum().over('shop')).plan(d.db);
  expect(ops(unordered).map((o) => o.op)).not.toContain('sort');
});

it('sum over a partition whose values are all null is 0, as sum is (decision B)', async () => {
  const d = await makeDb('in process (row)', [{ name: 'n', columns: [['g', 'TEXT'], ['v', 'INTEGER']], rows: [['a', 1], ['b', null], ['a', 2], ['b', null]] }]);
  closers.push(d.close);
  expect((await table('n').select('g', col('v').sum().over('g')).collect(d.db)).rows).toEqual([['a', 3], ['b', 0], ['a', 3], ['b', 0]]);
});
