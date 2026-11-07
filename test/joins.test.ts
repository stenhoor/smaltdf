/**
 * Joins and concatenation (DESIGN.md step 4) against REFERENCE.md "Joins", on row and columnar tables in process and
 * through the worker. Join rows come in no particular order unless `maintainOrder` (decision A): those tests sort.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { col, concat, lit, table } from '../src/index.js';
import { KINDS, type TableSpec, makeDb } from './helpers/db.js';

const ORDERS: TableSpec = {
  name: 'orders',
  columns: [['id', 'INTEGER'], ['cust', 'INTEGER'], ['qty', 'INTEGER']],
  rows: [[1, 10, 3], [2, 20, 1], [3, 10, 7], [4, 99, 2], [5, null, 4]],
};
const CUSTOMERS: TableSpec = {
  name: 'customers',
  columns: [['cust', 'INTEGER'], ['name', 'TEXT'], ['qty', 'INTEGER']],
  rows: [[10, 'ann', 100], [20, 'bo', 200], [30, 'cy', 300], [null, 'nobody', 0]],
};
const TRADES: TableSpec = {
  name: 'trades',
  columns: [['t', 'INTEGER'], ['sym', 'TEXT'], ['n', 'INTEGER']],
  rows: [[5, 'a', 1], [12, 'a', 2], [20, 'b', 3], [31, 'a', 4]],
};
const QUOTES: TableSpec = {
  name: 'quotes',
  columns: [['t', 'INTEGER'], ['sym', 'TEXT'], ['px', 'REAL']],
  rows: [[1, 'a', 1.0], [10, 'a', 1.1], [11, 'b', 9.0], [30, 'a', 1.3], [40, 'b', 9.5]],
};

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});
const open = async (kind: (typeof KINDS)[number]) => {
  const d = await makeDb(kind, [ORDERS, CUSTOMERS, TRADES, QUOTES]);
  closers.push(d.close);
  return d.db;
};
const sorted = (rows: unknown[][]) => [...rows].sort((a, b) => String(a).localeCompare(String(b)));

describe.each(KINDS)('%s', (kind) => {
  it('inner: matched rows; a key named by on appears once; null keys never match', async () => {
    const db = await open(kind);
    const r = await table('orders').join(table('customers'), { on: 'cust' }).collect(db);
    expect(r.columns).toEqual(['id', 'cust', 'qty', 'name', 'qty_right']);
    expect(sorted(r.rows)).toEqual(sorted([[1, 10, 3, 'ann', 100], [2, 20, 1, 'bo', 200], [3, 10, 7, 'ann', 100]]));
  });

  it('left, right and full: unmatched rows with nulls; a full join key is either side', async () => {
    const db = await open(kind);
    const left = await table('orders').join(table('customers').select('cust', 'name'), { on: 'cust', how: 'left' }).collect(db);
    expect(sorted(left.rows)).toEqual(sorted([[1, 10, 3, 'ann'], [2, 20, 1, 'bo'], [3, 10, 7, 'ann'], [4, 99, 2, null], [5, null, 4, null]]));
    const right = await table('orders').select('id', 'cust').join(table('customers').select('cust', 'name'), { on: 'cust', how: 'right' }).collect(db);
    expect(sorted(right.rows)).toEqual(sorted([[1, 10, 'ann'], [3, 10, 'ann'], [2, 20, 'bo'], [null, 30, 'cy'], [null, null, 'nobody']]));
    const full = await table('orders').select('id', 'cust').join(table('customers').select('cust', 'name'), { on: 'cust', how: 'full' }).collect(db);
    expect(sorted(full.rows)).toEqual(sorted([[1, 10, 'ann'], [3, 10, 'ann'], [2, 20, 'bo'], [4, 99, null], [5, null, null], [null, 30, 'cy'], [null, null, 'nobody']]));
  });

  it('semi and anti: the left rows with, or without, a match, in the left order', async () => {
    const db = await open(kind);
    const semi = await table('orders').join(table('customers'), { on: 'cust', how: 'semi' }).select('id').collect(db);
    expect(semi.rows).toEqual([[1], [2], [3]]);
    const anti = await table('orders').join(table('customers'), { on: 'cust', how: 'anti' }).select('id').collect(db);
    expect(anti.rows).toEqual([[4], [5]]);
  });

  it('leftOn / rightOn keep both sides; cross pairs every row; maintainOrder keeps the left order', async () => {
    const db = await open(kind);
    const r = await table('orders').select('id', 'qty').join(table('customers').select('name', 'qty'), { leftOn: col('qty').mul(100), rightOn: 'qty', suffix: '_c' }).collect(db);
    expect(r.columns).toEqual(['id', 'qty', 'name', 'qty_c']);
    expect(sorted(r.rows)).toEqual(sorted([[1, 3, 'cy', 300], [2, 1, 'ann', 100], [4, 2, 'bo', 200]]));
    const cross = await table('orders').select('id').head(2).join(table('customers').select('name').head(2), { how: 'cross' }).collect(db);
    expect(sorted(cross.rows)).toEqual(sorted([[1, 'ann'], [1, 'bo'], [2, 'ann'], [2, 'bo']]));
    const ordered = await table('orders').sort('qty').join(table('customers').select('cust', 'name'), { on: 'cust', how: 'left', maintainOrder: true }).select('id').collect(db);
    expect(ordered.rows).toEqual([[2], [4], [1], [5], [3]]);
  });

  it('joinAsof: the nearest right row by strategy, by equal columns, within a tolerance; left order', async () => {
    const db = await open(kind);
    const back = await table('trades').joinAsof(table('quotes'), { on: 't', by: 'sym' }).collect(db);
    expect(back.columns).toEqual(['t', 'sym', 'n', 'px']);
    expect(back.rows).toEqual([[5, 'a', 1, 1.0], [12, 'a', 2, 1.1], [20, 'b', 3, 9.0], [31, 'a', 4, 1.3]]);
    const fwd = await table('trades').joinAsof(table('quotes'), { on: 't', by: 'sym', strategy: 'forward' }).select('t', 'px').collect(db);
    expect(fwd.rows).toEqual([[5, 1.1], [12, 1.3], [20, 9.5], [31, null]]);
    const near = await table('trades').joinAsof(table('quotes'), { on: 't', strategy: 'nearest', tolerance: 1 }).select('t', 'px').collect(db);
    expect(near.rows).toEqual([[5, null], [12, 9.0], [20, null], [31, 1.3]]);
  });

  it('concat: the first frame’s rows, then the next’s, each in its order', async () => {
    const db = await open(kind);
    const r = await concat([table('orders').select('id').sort('id', { descending: true }).head(2), table('customers').select(col('cust').alias('id')), table('orders').select(lit(0).alias('id'))]).collect(db);
    expect(r.rows.map((x) => x[0])).toEqual([5, 4, 10, 20, 30, null, 0, 0, 0, 0, 0]);
  });

  it('errors name the method', async () => {
    const db = await open(kind);
    await expect(table('orders').join(table('customers'), {}).collect(db)).rejects.toThrow(/join: give on, or leftOn and rightOn/);
    await expect(table('orders').join(table('customers'), { leftOn: ['cust', 'qty'], rightOn: 'cust' }).collect(db)).rejects.toThrow(/the same number of keys/);
    await expect(table('orders').join(table('customers'), { leftOn: 'cust', rightOn: 'name' }).collect(db)).rejects.toThrow('join: key cust is int on the left and name is text on the right');
    await expect(table('orders').join(table('customers'), { on: 'nope' }).collect(db)).rejects.toThrow(/join: no column "nope" in orders/);
    await expect(table('orders').join(table('customers'), { how: 'cross', on: 'cust' }).collect(db)).rejects.toThrow(/cross join takes no keys/);
    // The left side already has qty and qty_right: the right qty can't take either name.
    await expect(table('orders').withColumns(lit(1).alias('qty_right')).join(table('customers'), { on: 'cust' }).collect(db)).rejects.toThrow(/two columns named "qty_right"/);
    await expect(concat([table('orders').select('id'), table('customers').select('name')]).collect(db)).rejects.toThrow(/concat: frame 2 has columns name, not id/);
    await expect(concat([table('orders').select('id'), table('customers').select(col('name').alias('id'))]).collect(db)).rejects.toThrow(/concat: column id is int in frame 1 and text in frame 2/);
    await expect(table('trades').joinAsof(table('quotes'), { on: 't', tolerance: -1 }).collect(db)).rejects.toThrow(/tolerance is a distance/);
  });
});

it('maintainOrder asks the engine for order; without it the engine is free (decision A)', async () => {
  const d = await makeDb('in process (row)', [ORDERS, CUSTOMERS]);
  closers.push(d.close);
  const joins = (x: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] => {
    if (x && typeof x === 'object') {
      if ((x as { op?: unknown }).op === 'join') out.push(x as Record<string, unknown>);
      for (const v of Object.values(x)) joins(v, out);
    }
    return out;
  };
  const flag = async (o: object) => joins(await table('orders').join(table('customers'), { on: 'cust', ...o }).plan(d.db)).map((j) => j.ordered ?? null);
  expect(await flag({ maintainOrder: true })).toEqual([true]);
  expect(await flag({})).toEqual([null]);
  // semi and anti keep the left order always: no flag needed.
  expect(await flag({ how: 'semi', maintainOrder: true })).toEqual([null]);
});
