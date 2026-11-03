import { describe, expect, test } from 'vitest';
import { Float64, Int64, String as Str, col, len, lit, when } from '../src/index.js';
import { setup, sorted } from './helpers.js';

describe('LazyFrame', () => {
  test('filter, select and sort compile to one statement', async () => {
    const { pl } = setup();
    const lf = pl.scanTable('orders').filter(col('qty').gt(1)).select('id', col('qty').mul(col('price')).alias('total')).sort('total', { descending: true });
    const sql = await lf.explain();
    expect(sql.split('SELECT').length - 1).toBe(1);
    const df = await lf.collect();
    expect(df.columns).toEqual(['id', 'total']);
    expect(df.getColumn('total')).toEqual(new Float64Array([4.5, 3, 3, 2.5]));
  });

  test('groupBy().agg() with keys first', async () => {
    const { pl } = setup();
    expect((await pl.scanTable('orders').groupBy('region').agg(col('qty').sum()).sort('qty').explain()).split('SELECT').length - 1).toBe(1);
    const df = await pl.scanTable('orders').groupBy('region').agg(col('qty').sum().alias('qty'), len(), col('price').mean()).sort('region').collect();
    expect(df.toDicts()).toEqual([
      { region: 'east', qty: 5, len: 1, price: 0.5 },
      { region: 'north', qty: 7, len: 3, price: 1.4166666666666667 },
      { region: 'south', qty: 3, len: 2, price: 1.75 },
    ]);
    expect([...df.schema]).toEqual([['region', Str], ['qty', Int64], ['len', Int64], ['price', Float64]]);
  });

  test('aggregates in select give one row; mixed with columns they broadcast', async () => {
    const { pl } = setup();
    expect((await pl.scanTable('orders').select(col('qty').sum(), col('qty').count().alias('n'), len()).collect()).toDicts()).toEqual([{ qty: 15, n: 5, len: 6 }]);
    const df = await pl.scanTable('orders').select('id', col('qty').max().alias('top')).sort('id').head(2).collect();
    expect(df.toDicts()).toEqual([{ id: 1, top: 5 }, { id: 2, top: 5 }]);
  });

  test('withColumns replaces in place and appends', async () => {
    const { pl } = setup();
    const df = await pl.scanTable('orders').withColumns(col('qty').fillNull(0), col('region').str.toUppercase().alias('R')).filter(col('id').le(3)).sort('id').collect();
    expect(df.columns).toEqual(['id', 'region', 'product', 'qty', 'price', 'R']);
    expect(df.getColumn('qty')).toEqual(new Float64Array([3, 1, 0]));
    expect(df.getColumn('R')).toEqual(['NORTH', 'SOUTH', 'NORTH']);
  });

  test('over() and filters on window expressions', async () => {
    const { pl } = setup();
    const df = await pl
      .scanTable('orders')
      .filter(col('price').eq(col('price').max().over('region')))
      .select('id', 'region')
      .sort('id')
      .collect();
    expect(df.toDicts()).toEqual([
      { id: 2, region: 'south' },
      { id: 3, region: 'north' },
      { id: 4, region: 'east' },
    ]);
  });

  test('rank methods', async () => {
    const { pl } = setup();
    const df = await pl
      .scanTable('orders')
      .select('id', col('price').rank().alias('avg'), col('price').rank('min').alias('min'), col('price').rank('dense').alias('dense'), col('price').rank('max').alias('max'))
      .sort('id')
      .collect();
    expect(df.getColumn('avg')).toEqual(new Float64Array([3.5, 5.5, 5.5, 1, 3.5, 2]));
    expect(df.getColumn('min')).toEqual(new Float64Array([3, 5, 5, 1, 3, 2]));
    expect(df.getColumn('dense')).toEqual(new Float64Array([3, 4, 4, 1, 3, 2]));
    expect(df.getColumn('max')).toEqual(new Float64Array([4, 6, 6, 1, 4, 2]));
  });

  test('when/then/otherwise, isIn, isBetween, booleans', async () => {
    const { pl } = setup();
    const df = await pl
      .scanTable('orders')
      .select('id', when(col('qty').gt(3)).then(lit('big')).when(col('qty').isNull()).then(lit('?')).otherwise(lit('small')).alias('size'), col('product').isIn(['apple', 'plum']).alias('ap'), col('qty').isBetween(2, 4).alias('mid'))
      .sort('id')
      .collect();
    expect(df.getColumn('size')).toEqual(['small', 'small', '?', 'big', 'small', 'big']);
    expect(df.getColumn('ap')).toEqual([true, false, false, true, true, true]);
    expect(df.getColumn('mid')).toEqual([true, false, null, false, true, true]);
  });

  test('joins', async () => {
    const { pl } = setup();
    const regions = pl.DataFrame({ region: ['north', 'south', 'west'], manager: ['ann', 'bob', 'cat'] });
    const inner = await pl.scanTable('orders').join(regions, { on: 'region' }).select('id', 'manager').sort('id').collect();
    expect(inner.toDicts().map((r) => r.manager)).toEqual(['ann', 'bob', 'ann', 'bob', 'ann']);
    const left = await pl.scanTable('orders').join(regions.lazy(), { on: 'region', how: 'left' }).filter(col('manager').isNull()).select('id').collect();
    expect(left.getColumn('id')).toEqual(new Float64Array([4]));
    const anti = await regions.join(pl.scanTable('orders'), { on: 'region', how: 'anti' });
    expect(anti.toDicts()).toEqual([{ region: 'west', manager: 'cat' }]);
    const both = await regions.join(regions, { on: 'region' });
    expect(both.columns).toEqual(['region', 'manager', 'manager_right']);
  });

  test('head, tail, slice, unique, rename, drop, withRowIndex, dropNulls', async () => {
    const { pl } = setup();
    const t = pl.scanTable('orders').sort('id');
    expect((await t.tail(2).select('id').collect()).getColumn('id')).toEqual(new Float64Array([5, 6]));
    expect((await t.slice(1, 2).select('id').collect()).getColumn('id')).toEqual(new Float64Array([2, 3]));
    expect((await t.head(4).slice(2).select('id').collect()).getColumn('id')).toEqual(new Float64Array([3, 4]));
    expect(sorted((await pl.scanTable('orders').select('region').unique().collect()).toDicts())).toEqual([{ region: 'east' }, { region: 'north' }, { region: 'south' }]);
    expect((await pl.scanTable('orders').unique('region').collect()).height).toBe(3);
    const r = await t.rename({ qty: 'quantity' }).drop('price', 'product').withRowIndex().head(1).collect();
    expect(r.toDicts()).toEqual([{ index: 0, id: 1, region: 'north', quantity: 3 }]);
    expect((await pl.scanTable('orders').dropNulls().collect()).height).toBe(5);
  });

  test('scanSql with parameters, and eager DataFrames', async () => {
    const { pl } = setup();
    const lf = pl.scanSql('SELECT id, qty FROM orders WHERE qty > ? AND id < ?2', [1, 6]);
    const df = await lf.filter(col('qty').lt(lit(5))).sort('id').collect();
    expect(df.getColumn('id')).toEqual(new Float64Array([1, 5]));
    const e = pl.DataFrame([{ a: 1, b: 'x' }, { a: 2, b: null }, { a: 3, b: 'y' }]);
    expect(e.shape).toEqual([3, 2]);
    expect((await e.filter(col('b').isNotNull())).getColumn('a')).toEqual(new Float64Array([1, 3]));
    expect((await (await e.groupBy('b').len()).sort('b')).toDicts()).toEqual([{ b: null, len: 1 }, { b: 'x', len: 1 }, { b: 'y', len: 1 }]);
  });

  test('errors carry Polars exception names', async () => {
    const { pl } = setup();
    await expect(pl.scanTable('orders').select('nope').collect()).rejects.toMatchObject({ kind: 'ColumnNotFoundError' });
    await expect(pl.scanTable('orders').select('id', col('qty').alias('id')).collect()).rejects.toMatchObject({ kind: 'DuplicateError' });
    expect(() => col('a').std()).toThrow(/statistics aggregates/);
    await expect(pl.scanTable('orders').groupBy('region').agg(col('qty')).collect()).rejects.toMatchObject({ kind: 'InvalidOperationError' });
  });
});
