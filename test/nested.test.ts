/**
 * Lists and structs (smaltdb ADR 0020 step 6): list and struct columns from JS arrays and objects, the list and struct
 * methods, implode, explode, unnest, and writes. In process and through the worker.
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
  const posts = () =>
    frame({
      id: [1, 2, 3, 4],
      tags: [['a', 'b'], [], null, ['c']],
      pt: [{ x: 1, y: 2.5 }, { x: 3, y: null }, null, { x: 0, y: 0 }],
      scores: [[3, 1, 2], [], null, [5, null, 5]],
    });

  it('JS arrays and objects are lists and structs, collected as arrays and objects', async () => {
    const db = await open();
    const r = await posts().collect(db);
    expect(r.types).toEqual(['int', 'list<text>', 'struct<x int, y real>', 'list<int>']);
    expect(r.rows[0]).toEqual([1, ['a', 'b'], { x: 1, y: 2.5 }, [3, 1, 2]]);
    expect(r.rows[2]).toEqual([3, null, null, null]);
    expect(() => frame({ a: [[1], ['x']] })).toThrow(/frame: column a\[\] mixes number and string/);
  });

  it('the list methods', async () => {
    const db = await open();
    const s = col('scores');
    const r = await posts()
      .select(
        s.list.len().alias('n'),
        s.list.get(0).alias('first'),
        s.list.last().alias('last'),
        s.list.contains(5).alias('has5'),
        s.list.sort({ descending: true }).alias('desc'),
        s.list.unique().alias('uniq'),
        s.list.sum().alias('sum'),
        s.list.mean().alias('mean'),
        s.list.max().alias('max'),
        col('tags').list.join('+').alias('joined'),
        s.list.head(2).alias('head'),
      )
      .collect(db);
    expect(r.rows[0]).toEqual([3, 3, 2, false, [3, 2, 1], [3, 1, 2], 6, 2, 3, 'a+b', [3, 1]]);
    expect(r.rows[1]).toEqual([0, null, null, false, [], [], 0, null, null, '', []]);
    expect(r.rows[3]).toEqual([3, 5, 5, true, [null, 5, 5], [5, null], 10, 5, 5, 'c', [5, null]]);
    await expect(posts().select(col('id').list.len()).collect(db)).rejects.toThrow(/list\.len: takes a list, not int/);
    await expect(posts().select(col('tags').list.sum()).collect(db)).rejects.toThrow(/takes a list of numbers/);
  });

  it('struct.field and unnest', async () => {
    const db = await open();
    expect((await posts().select(col('pt').struct.field('y')).collect(db)).rows.map((r) => r[0])).toEqual([2.5, null, null, 0]);
    const u = await posts().select('id', 'pt').unnest('pt').collect(db);
    expect(u.columns).toEqual(['id', 'x', 'y']);
    expect(u.types).toEqual(['int', 'int', 'real']);
    expect(u.rows[0]).toEqual([1, 1, 2.5]);
    await expect(posts().select(col('pt').struct.field('z')).collect(db)).rejects.toThrow(/has no field "z" \(fields: x, y\)/);
  });

  it('explode and implode', async () => {
    const db = await open();
    const e = await posts().select('id', 'tags').explode('tags').collect(db);
    expect(e.types).toEqual(['int', 'text']);
    // As Polars: an empty list gives no row, a null list one row with null.
    expect(e.rows).toEqual([[1, 'a'], [1, 'b'], [3, null], [4, 'c']]);
    const ids = async (o: Parameters<ReturnType<typeof posts>['explode']>[1]) => (await posts().select('id', 'tags').explode('tags', o).collect(db)).rows.map((r) => r[0]);
    expect(await ids({ emptyAsNull: true })).toEqual([1, 1, 2, 3, 4]);
    expect(await ids({ keepNulls: false })).toEqual([1, 1, 4]);
    const back = await posts().select('id', 'tags').explode('tags').groupBy('id', { maintainOrder: true }).agg(col('tags').implode()).collect(db);
    expect(back.types).toEqual(['int', 'list<text>']);
    expect(back.rows).toEqual([[1, ['a', 'b']], [3, [null]], [4, ['c']]]);
    await expect(posts().explode('id').collect(db)).rejects.toThrow(/explode: id is int, not a list/);
  });

  it('the list methods of statistics, changes and sets: types, and errors when the plan is built', async () => {
    const db = await open();
    const s = col('scores').list;
    const r = await posts()
      .select(s.median(), s.std().alias('std'), s.nUnique().alias('nu'), s.argMax().alias('am'), s.countMatches(5).alias('cm'), s.dropNulls().alias('dn'), s.diff().alias('d'), s.gather(col('scores')).alias('g'), s.setUnion(col('scores')).alias('u'))
      .collect(db);
    expect(r.types).toEqual(['real', 'real', 'int', 'int', 'int', 'list<int>', 'list<int>', 'list<int>', 'list<int>']);
    expect(r.rows[0]).toEqual([2, 1, 3, 0, 0, [3, 1, 2], [null, -2, 1], [null, 1, 2], [3, 1, 2]]);
    const fails = async (e: ReturnType<typeof col>, pattern: RegExp) => expect(posts().select(e).collect(db)).rejects.toThrow(pattern);
    await fails(col('tags').list.median(), /list\.median: takes a list of numbers/);
    await fails(col('scores').list.all(), /list\.all: takes a list of bool values/);
    await fails(col('tags').list.diff(), /list\.diff: takes a list of numbers or durations/);
    await fails(col('scores').list.gather(col('tags')), /list\.gather: takes a list of whole-number positions/);
    await fails(col('scores').list.setUnion(col('tags')), /list\.setUnion: takes two lists of one type/);
    await fails(col('scores').list.countMatches('x'), /list\.countMatches: counts a value of the list's element type/);
    expect(() => col('scores').list.std(0.5)).toThrow(/list\.std: expected a whole number for ddof, not 0\.5/);
    expect(() => col('scores').list.sample(1.5)).toThrow(/list\.sample: expected a whole number for n/);
    await fails(col('scores').list.item(), /list_item: the list has 3 elements, not 1/);
    await fails(col('scores').list.get(9, { nullOnOob: false }), /list_get: index 9 is out of range for a list of 3/);
  });

  it('a table keeps them: LIST and STRUCT storage', async () => {
    const db = await open();
    await posts().createTable(db, 'posts');
    const all = await table('posts').sort('id').collect(db);
    expect(all.types).toEqual(['int', 'list<text>', 'struct<x int, y real>', 'list<int>']);
    expect(all.rows[0]).toEqual([1, ['a', 'b'], { x: 1, y: 2.5 }, [3, 1, 2]]);
    expect(await frame({ id: [5], tags: [['d']], pt: [null], scores: [[]] }).insertInto(db, 'posts')).toEqual({ rows: 1 });
    await expect(frame({ id: [6], tags: [[1]], pt: [null], scores: [null] }).insertInto(db, 'posts')).rejects.toThrow(/tags is list<int>, and posts.tags holds list<text>/);
    expect((await table('posts').filter(col('tags').list.contains('d')).select('id').collect(db)).rows).toEqual([[5]]);
    expect((await table('posts').filter(col('tags').eq(lit(null)).not()).select('id').collect(db)).rows.length).toBe(0);
  });
});
