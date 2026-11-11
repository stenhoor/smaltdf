/**
 * Views (DESIGN.md step 8) against the reference (docs/reference/), on row and columnar tables in process and through the
 * worker. smaltdf's views are its own serialized frames, bound by `dfLanguage` where a plan reads them: the tests
 * register it, as an application does where the engine runs. No SQL is registered.
 */
import { registerLanguage } from 'smaltdb/engine';
import { registeredLanguage } from 'smaltdb-src/engine/plan/language.js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { col, dfLanguage, frame, len, lit, refreshView, table, update } from '../src/index.js';
import { KINDS, type TableSpec, makeDb } from './helpers/db.js';

beforeAll(() => registerLanguage(dfLanguage));

const ORDERS: TableSpec = {
  name: 'orders',
  columns: [['id', 'INTEGER'], ['region', 'TEXT'], ['qty', 'INTEGER']],
  rows: [[1, 'n', 3], [2, 's', 12], [3, 'n', 7], [4, 'e', null]],
};
const REGIONS: TableSpec = { name: 'regions', columns: [['region', 'TEXT'], ['label', 'TEXT']], rows: [['n', 'North'], ['s', 'South']] };

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});
const open = async (kind: (typeof KINDS)[number]) => {
  const d = await makeDb(kind, [ORDERS, REGIONS]);
  closers.push(d.close);
  return d.db;
};

it('only smaltdf is registered: views need no other language', () => {
  expect(registeredLanguage('df')).toBe(dfLanguage);
  expect(registeredLanguage('sql')).toBeUndefined();
});

describe.each(KINDS)('%s', (kind) => {
  it('a view is read by name, and follows its tables', async () => {
    const db = await open(kind);
    await table('orders').filter(col('qty').gt(5)).select('id', col('qty').mul(2).alias('double')).createView(db, 'big');
    const r = await table('big').collect(db);
    expect(r.columns).toEqual(['id', 'double']);
    expect(r.types).toEqual(['int', 'int']);
    expect(r.rows).toEqual([[2, 24], [3, 14]]);
    await update('orders', { set: { qty: 100 }, where: col('id').eq(1) }).run(db);
    expect((await table('big').sort('id').collect(db)).rows).toEqual([[1, 200], [2, 24], [3, 14]]);
  });

  it('views of views, joined with tables and aggregated, with literals of every kind', async () => {
    const db = await open(kind);
    await table('orders').join(table('regions'), { on: 'region', how: 'left' }).withColumns(lit(9007199254740993n).alias('big'), lit(new Uint8Array([1, 255])).alias('b')).createView(db, 'labelled');
    await table('labelled').groupBy('label', { maintainOrder: true }).agg(len(), col('qty').sum()).createView(db, 'by_label');
    const r = await table('by_label').collect(db);
    expect(r.rows).toEqual([['North', 2, 10], ['South', 1, 12], [null, 1, 0]]);
    const one = await table('labelled').select('big', 'b').head(1).collect(db);
    expect(one.rows).toEqual([[9007199254740993n, new Uint8Array([1, 255])]]);
  });

  it('a materialized view keeps its rows until refreshed', async () => {
    const db = await open(kind);
    await table('orders').select(col('qty').sum()).createView(db, 'total', { materialized: true });
    expect((await table('total').collect(db)).rows).toEqual([[22]]);
    await update('orders', { set: { qty: 0 } }).run(db);
    expect((await table('total').collect(db)).rows).toEqual([[22]]);
    await refreshView(db, 'total');
    expect((await table('total').collect(db)).rows).toEqual([[0]]);
  });

  it('a pivot in a view keeps the columns it had when the view was made', async () => {
    const db = await open(kind);
    await table('orders').pivot('region', { index: 'id', values: 'qty' }).createView(db, 'wide');
    expect((await table('wide').collect(db)).columns).toEqual(['id', 'e', 'n', 's']);
  });

  it('errors', async () => {
    const db = await open(kind);
    await expect(frame({ a: [1] }).createView(db, 'v')).rejects.toThrow(/a view is stored by name, so it reads tables and views/);
    await table('orders').createView(db, 'v');
    await expect(table('orders').createView(db, 'v')).rejects.toThrow(/v/);
    await table('regions').createView(db, 'v', { ifNotExists: true });
    expect((await table('v').collect(db)).columns).toEqual(['id', 'region', 'qty']);
    await expect(table('v').select('nope').collect(db)).rejects.toThrow(/select: no column "nope" in v/);
  });
});

it('dfLanguage names the tables and views a view reads, through joins and concat', async () => {
  const d = await makeDb('in process (row)', [ORDERS, REGIONS]);
  closers.push(d.close);
  const { concat } = await import('../src/index.js');
  await concat([table('orders').select('id'), table('orders').join(table('regions'), { on: 'region', how: 'semi' }).select('id')]).createView(d.db, 'mixed');
  const v = (d.db as unknown as { catalog: { view(n: string): { language: string; text: string } } }).catalog.view('mixed');
  expect(dfLanguage.viewReferences!({ language: v.language, text: v.text }).map((r) => r.name)).toEqual(['orders', 'orders', 'regions']);
  expect(dfLanguage.viewDefinition!({ language: v.language, text: v.text })).toBe(v.text);
});
