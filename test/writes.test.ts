/**
 * Writing (DESIGN.md step 7) against REFERENCE.md "Writing", on row and columnar tables in process and through the
 * worker. Every write is a plan statement; no language is registered.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { col, deleteFrom, frame, lit, table, update } from '../src/index.js';
import { KINDS, type TableSpec, makeDb } from './helpers/db.js';

const ITEMS: TableSpec = {
  name: 'items',
  columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['qty', 'INTEGER'], ['price', 'REAL']],
  rows: [[1, 'pen', 10, 1.5], [2, 'ink', 0, 4.0], [3, 'pad', 5, 2.0]],
};

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});
const open = async (kind: (typeof KINDS)[number]) => {
  const d = await makeDb(kind, [ITEMS]);
  closers.push(d.close);
  return d.db;
};
const all = async (db: Awaited<ReturnType<typeof open>>, name = 'items') => (await table(name).sort('id').collect(db)).rows;

describe.each(KINDS)('%s', (kind) => {
  it('insertInto: rows by column name; other columns take their defaults', async () => {
    const db = await open(kind);
    expect(await frame({ id: [4, 5], name: ['cup', 'mug'] }).insertInto(db, 'items')).toEqual({ rows: 2 });
    expect(await all(db)).toEqual([[1, 'pen', 10, 1.5], [2, 'ink', 0, 4.0], [3, 'pad', 5, 2.0], [4, 'cup', null, null], [5, 'mug', null, null]]);
    // From the table itself, computed: an int fits a REAL column.
    expect(await table('items').filter(col('qty').gt(0)).select(col('id').add(10), 'name', col('qty').alias('price')).insertInto(db, 'items')).toEqual({ rows: 2 });
    expect((await table('items').filter(col('id').gt(10)).sort('id').select('id', 'price').collect(db)).rows).toEqual([[11, 10], [13, 5]]);
  });

  it('createTable: a new table typed from the frame, with its rows, in one transaction', async () => {
    const db = await open(kind);
    const r = await table('items').select('name', col('qty').mul(col('price')).alias('value'), col('qty').gt(1).alias('many')).createTable(db, 'stock', { storage: 'columnar' });
    expect(r).toEqual({ rows: 3 });
    const s = await table('stock').collect(db);
    expect(s.columns).toEqual(['name', 'value', 'many']);
    // bool is stored as BOOLEAN (smaltdb ADR 0018): it reads back as bool.
    expect(s.types).toEqual(['text', 'real', 'bool']);
    expect(s.rows).toEqual([['pen', 15, true], ['ink', 0, false], ['pad', 10, true]]);
    expect(await table('items').createTable(db, 'stock', { ifNotExists: true })).toEqual({ rows: 0 });
    await expect(table('items').createTable(db, 'stock')).rejects.toThrow(/stock/);
    // A failing insert leaves no table behind.
    await expect(frame({ a: [9223372036854775807n] }).select(col('a').add(1)).createTable(db, 'broken')).rejects.toThrow(/overflow/);
    await expect(table('broken').collect(db)).rejects.toThrow(/no table or view "broken"/);
  });

  it('update: set columns where a predicate holds, reading the row as it was', async () => {
    const db = await open(kind);
    expect(await update('items', { set: { qty: col('qty').add(1), price: col('qty').mul(2) }, where: col('id').ne(2) }).run(db)).toEqual({ rows: 2 });
    expect(await all(db)).toEqual([[1, 'pen', 11, 20], [2, 'ink', 0, 4.0], [3, 'pad', 6, 10]]);
    expect(await update('items', { set: { name: 'x' } }).run(db)).toEqual({ rows: 3 });
    expect((await table('items').select('name').unique().collect(db)).rows).toEqual([['x']]);
  });

  it('deleteFrom: the rows a predicate holds for, or all', async () => {
    const db = await open(kind);
    expect(await deleteFrom('items', { where: col('qty').eq(0) }).run(db)).toEqual({ rows: 1 });
    expect((await all(db)).map((r) => r[0])).toEqual([1, 3]);
    expect(await deleteFrom('items').run(db)).toEqual({ rows: 2 });
    expect(await all(db)).toEqual([]);
  });

  it('errors name the method', async () => {
    const db = await open(kind);
    await expect(frame({ id: [9], colour: ['red'] }).insertInto(db, 'items')).rejects.toThrow('insertInto: items has no column "colour" (columns: id, name, qty, price)');
    await expect(frame({ qty: ['many'] }).insertInto(db, 'items')).rejects.toThrow('insertInto: column qty is text, and items.qty holds INTEGER');
    await expect(frame({ x: [1] }).insertInto(db, 'nope')).rejects.toThrow(/insertInto: no table "nope"/);
    await expect(update('items', { set: { qty: lit('x') } }).run(db)).rejects.toThrow('update: column qty is text, and items.qty holds INTEGER');
    await expect(update('items', { set: {} }).run(db)).rejects.toThrow(/set names no column/);
    await expect(update('items', { set: { qty: 1 }, where: col('qty') }).run(db)).rejects.toThrow(/where is bool, not int/);
    await expect(deleteFrom('items', { where: col('nope').eq(1) }).run(db)).rejects.toThrow(/deleteFrom: no column "nope"/);
    await expect(update('items', { set: { qty: col('qty').add(9223372036854775807n) } }).run(db)).rejects.toThrow(/update: add: integer overflow/);
    // Nothing above changed a row.
    expect(await all(db)).toEqual(ITEMS.rows);
  });
});

it('onConflict: abort undoes the whole write, ignore skips the row, replace replaces the one it conflicts with', async () => {
  const d = await makeDb('in process (row)', []);
  closers.push(d.close);
  const engine = d.db as unknown as { queryPlan(s: unknown): unknown };
  engine.queryPlan({ kind: 'schema', op: { op: 'createTable', table: { name: 'k', columns: [{ name: 'id', declaredType: 'INTEGER', type: 'INTEGER', notNull: false, collation: 'binary' }, { name: 'v', declaredType: 'TEXT', type: 'TEXT', notNull: false, collation: 'binary' }], keys: [{ kind: 'primaryKey', columns: [{ column: 0, desc: false, collation: 'binary' }] }], checks: [], foreignKeys: [], storage: 'row' }, temp: false, ifNotExists: false } });
  await frame({ id: [1, 2], v: ['a', 'b'] }).insertInto(d.db, 'k');
  const rows = async () => (await table('k').sort('id').collect(d.db)).rows;
  await expect(frame({ id: [3, 1], v: ['c', 'x'] }).insertInto(d.db, 'k')).rejects.toMatchObject({ code: 'SMALT_CONSTRAINT_PRIMARYKEY' });
  expect(await rows()).toEqual([[1, 'a'], [2, 'b']]);
  expect(await frame({ id: [3, 1], v: ['c', 'x'] }).insertInto(d.db, 'k', { onConflict: 'ignore' })).toEqual({ rows: 1 });
  expect(await rows()).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
  await frame({ id: [2], v: ['B'] }).insertInto(d.db, 'k', { onConflict: 'replace' });
  expect(await rows()).toEqual([[1, 'a'], [2, 'B'], [3, 'c']]);
});
