/**
 * Core frames (DESIGN.md step 2) against REFERENCE.md: each test runs on a row table and a columnar table in
 * process, and through the client and worker server. No language is registered.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { registeredLanguage } from 'smaltdb-src/engine/plan/language.js';
import { DfError, col, lit, table } from '../src/index.js';
import { KINDS, type TableSpec, makeDb } from './helpers/db.js';

const ORDERS: TableSpec = {
  name: 'orders',
  columns: [['id', 'INTEGER'], ['region', 'TEXT'], ['qty', 'INTEGER'], ['price', 'REAL']],
  rows: [
    [1, 'north', 3, 2.5],
    [2, 'south', 12, 1.0],
    [3, 'north', null, 4.0],
    [4, 'east', 7, null],
    [5, 'south', 12, 3.0],
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

it('runs with no language registered', () => {
  expect(registeredLanguage('sql')).toBeUndefined();
});

describe.each(KINDS)('%s', (kind) => {
  it('table: every column, in storage order', async () => {
    const r = await table('orders').collect(await open(kind));
    expect(r.columns).toEqual(['id', 'region', 'qty', 'price']);
    expect(r.types).toEqual(['int', 'text', 'int', 'real']);
    expect(r.rows.map((x) => x[0])).toEqual([1, 2, 3, 4, 5]);
  });

  it('select and withColumns: columns by expression, added at the end or replaced in place', async () => {
    const db = await open(kind);
    const s = await table('orders').select('id', col('qty').mul(col('price')).alias('total')).collect(db);
    expect(s.columns).toEqual(['id', 'total']);
    expect(s.types).toEqual(['int', 'real']);
    expect(s.rows).toEqual([[1, 7.5], [2, 12], [3, null], [4, null], [5, 36]]);
    const w = await table('orders').withColumns(col('qty').add(1), col('id').mul(10).alias('ten')).collect(db);
    expect(w.columns).toEqual(['id', 'region', 'qty', 'price', 'ten']);
    expect(w.rows[0]).toEqual([1, 'north', 4, 2.5, 10]);
    // A computed column is named after its leftmost column.
    expect((await table('orders').select(col('qty').add(1)).collect(db)).columns).toEqual(['qty']);
  });

  it('filter: rows where every predicate is true, not false or null; order kept', async () => {
    const db = await open(kind);
    const r = await table('orders').filter(col('qty').gt(5), col('region').ne('east')).select('id').collect(db);
    expect(r.rows).toEqual([[2], [5]]);
    expect((await table('orders').filter(col('qty').isNull()).select('id').collect(db)).rows).toEqual([[3]]);
    expect((await table('orders').filter(col('qty').gt(5).or(col('price').isNull())).select('id').collect(db)).rows).toEqual([[2], [4], [5]]);
    expect((await table('orders').filter(col('qty').gt(5).not()).select('id').collect(db)).rows).toEqual([[1]]);
  });

  it('sort: stable, nulls first by default, descending per key', async () => {
    const db = await open(kind);
    const ids = async (f: ReturnType<typeof table>) => (await f.select('id').collect(db)).rows.map((r) => r[0]);
    expect(await ids(table('orders').sort('qty'))).toEqual([3, 1, 4, 2, 5]);
    expect(await ids(table('orders').sort('qty', { nullsLast: true }))).toEqual([1, 4, 2, 5, 3]);
    expect(await ids(table('orders').sort('qty', { descending: true }))).toEqual([3, 2, 5, 4, 1]);
    // Stable: 2 and 5 tie on qty and keep their order; then by region descending, price ascending.
    expect(await ids(table('orders').sort(['region', 'price'], { descending: [true, false] }))).toEqual([2, 5, 1, 3, 4]);
  });

  it('head, tail and slice', async () => {
    const db = await open(kind);
    const ids = async (f: ReturnType<typeof table>) => (await f.select('id').collect(db)).rows.map((r) => r[0]);
    expect(await ids(table('orders').head(2))).toEqual([1, 2]);
    expect(await ids(table('orders').tail(2))).toEqual([4, 5]);
    expect(await ids(table('orders').slice(1, 2))).toEqual([2, 3]);
    expect(await ids(table('orders').slice(3))).toEqual([4, 5]);
    expect(await ids(table('orders').sort('id', { descending: true }).head(1))).toEqual([5]);
  });

  it('comparisons and logic are bool: true / false, null stays null (decision C)', async () => {
    const db = await open(kind);
    const r = await table('orders').select('id', col('qty').gt(5).alias('big'), col('qty').eqMissing(lit(null)).alias('missing')).collect(db);
    expect(r.types).toEqual(['int', 'bool', 'bool']);
    expect(r.rows).toEqual([[1, false, false], [2, true, false], [3, null, true], [4, true, false], [5, true, false]]);
    expect(r.toObjects()[1]).toEqual({ id: 2, big: true, missing: false });
  });

  it('arithmetic means what the reference says', async () => {
    const db = await open(kind, [{ name: 'n', columns: [['a', 'INTEGER'], ['b', 'INTEGER']], rows: [[-7, 2], [7, 2], [1, 0]] }]);
    const r = await table('n').select(col('a').div(col('b')).alias('div'), col('a').floorDiv(col('b')).alias('fdiv'), col('a').mod(col('b')).alias('mod')).collect(db);
    expect(r.types).toEqual(['real', 'int', 'int']);
    expect(r.rows).toEqual([[-3.5, -4, 1], [3.5, 3, 1], [Infinity, null, null]]);
    const t = await table('n').select(lit(2.5).round().alias('r'), lit('ÄB').str.lower().alias('l'), lit('abc').str.contains('b').alias('c')).head(1).collect(db);
    expect(t.rows).toEqual([[2, 'äb', true]]);
  });

  it('integer overflow and failed conversions are errors (decision E), naming the method', async () => {
    const db = await open(kind, [{ name: 'big', columns: [['a', 'INTEGER'], ['s', 'TEXT']], rows: [[9223372036854775807n, 'x'], [1, '12']] }]);
    await expect(table('big').select(col('a').add(1)).collect(db)).rejects.toMatchObject({ name: 'DfError', code: 'SMALT_RANGE', message: expect.stringMatching(/^select: add: integer overflow/) });
    await expect(table('big').select(col('s').cast('int')).collect(db)).rejects.toMatchObject({ code: 'SMALT_MISMATCH', message: expect.stringMatching(/^select: cast: cannot convert text "x"/) });
    expect((await table('big').filter(col('s').eq('12')).select(col('s').cast('int')).collect(db)).rows).toEqual([[12]]);
  });

  it('errors found while building name the method and what was wrong', async () => {
    const db = await open(kind);
    await expect(table('orders').filter(col('qtty').gt(1)).collect(db)).rejects.toThrow('filter: no column "qtty" in orders (columns: id, region, qty, price)');
    await expect(table('nope').collect(db)).rejects.toThrow(/no table or view "nope"/);
    await expect(table('orders').select(col('region').add(1)).collect(db)).rejects.toThrow('select: add: takes numbers, not text and int');
    await expect(table('orders').filter(col('qty')).collect(db)).rejects.toThrow(/filter: a predicate is bool, not int/);
    await expect(table('orders').select('id', col('qty').alias('id')).collect(db)).rejects.toThrow(/two columns named "id"/);
    await expect(table('orders').select(col('region').gt(1)).collect(db)).rejects.toBeInstanceOf(DfError);
  });

  it('plan(): the statement the frame runs as, plain data', async () => {
    const db = await open(kind);
    const s = await table('orders').filter(col('qty').gt(5)).select('id').plan(db);
    expect(s.kind).toBe('query');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

it('frames run nothing until collected, and are reusable', () => {
  expect(() => table('anything').filter(col('x').gt(1)).head(3)).not.toThrow();
  expect(() => table('t').head(-1)).toThrow(/head: expected a whole number of rows/);
});
