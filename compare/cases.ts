/**
 * The comparison cases: each runs a smaltdf frame and a Polars expression of the same function over the same tables.
 * A case is the same unless it says how the two differ (`differs`); compare.test.ts checks both ways, and writes the
 * differences into docs/REFERENCE.md ("Compared with Polars").
 */
import { col, concat, len, lit, table, type Frame } from '../src/index.js';

/** A table as both sides make it: columns typed `int`, `real` or `text`. */
export interface CompareTable {
  readonly columns: readonly [string, 'int' | 'real' | 'text'][];
  readonly rows: readonly (readonly (number | bigint | string | null)[])[];
}

export const TABLES: Readonly<Record<string, CompareTable>> = {
  orders: {
    columns: [['id', 'int'], ['region', 'text'], ['qty', 'int'], ['price', 'real']],
    rows: [[1, 'n', 3, 2.5], [2, 's', 12, 1.0], [3, 'n', 7, null], [4, 'e', null, 4.0], [5, 's', 1, 2.5], [6, null, 5, 3.0]],
  },
  regions: { columns: [['region', 'text'], ['label', 'text']], rows: [['n', 'North'], ['s', 'South'], ['w', 'West']] },
  nums: { columns: [['a', 'int'], ['b', 'int'], ['x', 'real']], rows: [[-7, 2, 2.5], [7, -2, 3.5], [0, 0, -0.5], [9223372036854775807n, 1, 0.125], [null, 3, null]] },
  words: { columns: [['w', 'text']], rows: [['Apple'], ['bANANA'], ['ÄRGER'], [null], ['cherry pie']] },
  trades: { columns: [['t', 'int'], ['sym', 'text'], ['px', 'real']], rows: [[1, 'a', 10], [3, 'b', 20], [5, 'a', 11], [8, 'b', 21]] },
  quotes: { columns: [['t', 'int'], ['sym', 'text'], ['bid', 'real']], rows: [[0, 'a', 9.5], [2, 'b', 19.5], [4, 'a', 10.5], [9, 'b', 20.5]] },
  scores: { columns: [['name', 'text'], ['subject', 'text'], ['score', 'int']], rows: [['bo', 'math', 70], ['ann', 'math', 90], ['ann', 'art', 80], ['cy', 'music', 50], ['bo', 'art', null]] },
  wide: { columns: [['id', 'int'], ['q1', 'int'], ['q2', 'int']], rows: [[1, 10, 20], [2, null, 40]] },
};

export interface Case {
  /** Unique; the row of the reference's table. */
  readonly id: string;
  /** The function compared, as smaltdf names it. */
  readonly fn: string;
  readonly df: Frame;
  /** A Python expression of `pl` and `t` (the tables as DataFrames) giving a DataFrame or LazyFrame. */
  readonly polars: string;
  /** Rows compared in order (default) or as a multiset, where neither side orders them. */
  readonly ordered?: boolean;
  /** How the two differ; absent when they give the same columns, types, rows or error. */
  readonly differs?: string;
}

const o = () => table('orders');
const n = () => table('nums');

export const CASES: readonly Case[] = [
  // Frames
  { id: 'filter', fn: 'filter', df: o().filter(col('qty').gt(4)), polars: "t['orders'].filter(pl.col('qty') > 4)" },
  { id: 'filter-and', fn: 'filter', df: o().filter(col('qty').gt(2), col('price').lt(3)), polars: "t['orders'].filter(pl.col('qty') > 2, pl.col('price') < 3)" },
  { id: 'select', fn: 'select', df: o().select('id', col('qty').mul(2).alias('q2')), polars: "t['orders'].select('id', (pl.col('qty') * 2).alias('q2'))" },
  { id: 'with-columns', fn: 'withColumns', df: o().withColumns(col('qty').add(1), col('price').mul(col('qty')).alias('total')), polars: "t['orders'].with_columns(pl.col('qty') + 1, (pl.col('price') * pl.col('qty')).alias('total'))" },
  { id: 'sort', fn: 'sort', df: o().sort('qty'), polars: "t['orders'].sort('qty')" },
  { id: 'sort-desc-nulls-last', fn: 'sort', df: o().sort(['region', 'qty'], { descending: [false, true], nullsLast: true }), polars: "t['orders'].sort(['region', 'qty'], descending=[False, True], nulls_last=True)" },
  { id: 'sort-stable', fn: 'sort', df: o().sort('price'), polars: "t['orders'].sort('price', maintain_order=True)" },
  { id: 'head', fn: 'head', df: o().head(2), polars: "t['orders'].head(2)" },
  { id: 'tail', fn: 'tail', df: o().tail(2), polars: "t['orders'].tail(2)" },
  { id: 'slice', fn: 'slice', df: o().slice(1, 3), polars: "t['orders'].slice(1, 3)" },

  // Expressions
  { id: 'div', fn: 'div', df: n().select(col('a').div(col('b'))), polars: "t['nums'].select(pl.col('a') / pl.col('b'))" },
  { id: 'floor-div', fn: 'floorDiv', df: n().filter(col('b').ne(0)).select(col('a').floorDiv(col('b'))), polars: "t['nums'].filter(pl.col('b') != 0).select(pl.col('a') // pl.col('b'))" },
  { id: 'mod', fn: 'mod', df: n().filter(col('b').ne(0)).select(col('a').mod(col('b'))), polars: "t['nums'].filter(pl.col('b') != 0).select(pl.col('a') % pl.col('b'))" },
  { id: 'div-zero', fn: 'div', df: n().select(col('x').div(0)), polars: "t['nums'].select(pl.col('x') / 0)" },
  { id: 'floor-div-zero', fn: 'floorDiv', df: n().select(col('a').floorDiv(0).alias('q'), col('a').mod(0).alias('r')), polars: "t['nums'].select((pl.col('a') // 0).alias('q'), (pl.col('a') % 0).alias('r'))" },
  { id: 'add-overflow', fn: 'add', df: n().select(col('a').add(1)), polars: "t['nums'].select(pl.col('a') + 1)", differs: 'An integer overflow is an error in smaltdf (decision E); Polars wraps around.' },
  { id: 'add-real', fn: 'add', df: n().select(col('a').add(col('x'))), polars: "t['nums'].select(pl.col('a') + pl.col('x'))" },
  { id: 'compare-null', fn: 'eq', df: o().select(col('qty').eq(7), col('qty').eqMissing(lit(null)).alias('m')), polars: "t['orders'].select(pl.col('qty') == 7, pl.col('qty').eq_missing(None).alias('m'))" },
  { id: 'logic-null', fn: 'and', df: o().select(col('qty').gt(4).and(col('price').gt(2)).alias('a'), col('qty').gt(4).or(col('price').gt(2)).alias('o'), col('qty').gt(4).not().alias('n')), polars: "t['orders'].select((pl.col('qty') > 4) & (pl.col('price') > 2), ((pl.col('qty') > 4) | (pl.col('price') > 2)).alias('o'), (~(pl.col('qty') > 4)).alias('n')).rename({'qty': 'a'})" },
  { id: 'is-null', fn: 'isNull', df: o().select(col('qty').isNull(), col('price').isNotNull()), polars: "t['orders'].select(pl.col('qty').is_null(), pl.col('price').is_not_null())" },
  { id: 'cast-int', fn: 'cast', df: n().select(col('x').cast('int')), polars: "t['nums'].select(pl.col('x').cast(pl.Int64))" },
  { id: 'cast-text-to-int', fn: 'cast', df: table('words').select(col('w').cast('int')), polars: "t['words'].select(pl.col('w').cast(pl.Int64))" },
  { id: 'cast-text', fn: 'cast', df: n().select(col('a').cast('text'), col('x').cast('text')), polars: "t['nums'].select(pl.col('a').cast(pl.String), pl.col('x').cast(pl.String))" },
  { id: 'round', fn: 'round', df: n().select(col('x').round(0)), polars: "t['nums'].select(pl.col('x').round(0))" },
  { id: 'str-case', fn: 'str.lower', df: table('words').select(col('w').str.lower().alias('l'), col('w').str.upper().alias('u')), polars: "t['words'].select(pl.col('w').str.to_lowercase().alias('l'), pl.col('w').str.to_uppercase().alias('u'))" },
  { id: 'str-contains', fn: 'str.contains', df: table('words').select(col('w').str.contains('an+a')), polars: "t['words'].select(pl.col('w').str.contains('an+a'))" },

  // Aggregation
  { id: 'agg', fn: 'groupBy', df: o().groupBy('region').agg(col('qty').sum(), col('price').mean().alias('mean'), col('qty').min().alias('min'), col('qty').max().alias('max'), col('qty').count().alias('count'), len()), polars: "t['orders'].group_by('region').agg(pl.col('qty').sum(), pl.col('price').mean().alias('mean'), pl.col('qty').min().alias('min'), pl.col('qty').max().alias('max'), pl.col('qty').count().alias('count'), pl.len())", ordered: false },
  { id: 'agg-maintain-order', fn: 'groupBy', df: o().groupBy('region', { maintainOrder: true }).agg(col('qty').first().alias('first'), col('qty').last().alias('last')), polars: "t['orders'].group_by('region', maintain_order=True).agg(pl.col('qty').first().alias('first'), pl.col('qty').last().alias('last'))" },
  { id: 'agg-stats', fn: 'median', df: o().select(col('qty').median().alias('median'), col('qty').std().alias('std'), col('qty').var().alias('var')), polars: "t['orders'].select(pl.col('qty').median().alias('median'), pl.col('qty').std().alias('std'), pl.col('qty').var().alias('var'))" },
  { id: 'sum-no-values', fn: 'sum', df: o().filter(col('qty').gt(100)).select(col('qty').sum(), col('price').mean()), polars: "t['orders'].filter(pl.col('qty') > 100).select(pl.col('qty').sum(), pl.col('price').mean())" },
  { id: 'unique', fn: 'unique', df: o().unique({ subset: 'region', keep: 'first', maintainOrder: true }), polars: "t['orders'].unique(subset='region', keep='first', maintain_order=True)" },
  { id: 'unique-last', fn: 'unique', df: o().unique({ subset: 'price', keep: 'last', maintainOrder: true }), polars: "t['orders'].unique(subset='price', keep='last', maintain_order=True)", differs: "With `keep: 'last'` and `maintainOrder`, smaltdf gives the rows in order of each group's first row; Polars in order of the rows it keeps." },

  // Joins
  { id: 'join-inner', fn: 'join', df: o().join(table('regions'), { on: 'region' }), polars: "t['orders'].join(t['regions'], on='region')", ordered: false },
  { id: 'join-left', fn: 'join', df: o().join(table('regions'), { on: 'region', how: 'left', maintainOrder: true }), polars: "t['orders'].join(t['regions'], on='region', how='left', maintain_order='left')" },
  { id: 'join-full', fn: 'join', df: o().join(table('regions'), { on: 'region', how: 'full' }), polars: "t['orders'].join(t['regions'], on='region', how='full')", ordered: false, differs: 'A `full` join gives its `on` keys once in smaltdf, from whichever side has them; Polars keeps both sides\' (`region`, `region_right`) unless `coalesce=True`.' },
  { id: 'join-right', fn: 'join', df: o().join(table('regions'), { on: 'region', how: 'right' }), polars: "t['orders'].join(t['regions'], on='region', how='right')", ordered: false, differs: "A `right` join keeps the key column in the left side's place in smaltdf; Polars moves it to just before the right side's other columns." },
  { id: 'join-semi', fn: 'join', df: o().join(table('regions'), { on: 'region', how: 'semi' }), polars: "t['orders'].join(t['regions'], on='region', how='semi')" },
  { id: 'join-anti', fn: 'join', df: o().join(table('regions'), { on: 'region', how: 'anti' }), polars: "t['orders'].join(t['regions'], on='region', how='anti')" },
  { id: 'join-cross', fn: 'join', df: table('regions').join(table('wide'), { how: 'cross' }), polars: "t['regions'].join(t['wide'], how='cross')", ordered: false },
  { id: 'join-suffix', fn: 'join', df: table('trades').join(table('quotes'), { on: 'sym' }), polars: "t['trades'].join(t['quotes'], on='sym')", ordered: false },
  { id: 'join-asof', fn: 'joinAsof', df: table('trades').joinAsof(table('quotes'), { on: 't', by: 'sym' }), polars: "t['trades'].join_asof(t['quotes'], on='t', by='sym')" },
  { id: 'join-asof-forward', fn: 'joinAsof', df: table('trades').joinAsof(table('quotes'), { on: 't', strategy: 'forward' }), polars: "t['trades'].join_asof(t['quotes'], on='t', strategy='forward')" },
  { id: 'join-asof-nearest', fn: 'joinAsof', df: table('trades').joinAsof(table('quotes'), { on: 't', strategy: 'nearest', tolerance: 1 }), polars: "t['trades'].join_asof(t['quotes'], on='t', strategy='nearest', tolerance=1)", differs: '`nearest` takes the smaller key when two are equally near in smaltdf; Polars takes the larger.' },
  { id: 'concat', fn: 'concat', df: concat([table('regions'), table('regions').head(1)]), polars: "pl.concat([t['regions'], t['regions'].head(1)])" },

  // Windows
  { id: 'over-sum', fn: 'over', df: o().select('id', col('qty').sum().over('region').alias('s')), polars: "t['orders'].select('id', pl.col('qty').sum().over('region').alias('s'))" },
  { id: 'cum', fn: 'cumSum', df: o().select(col('qty').cumSum().alias('s'), col('qty').cumMin().alias('mn'), col('qty').cumMax().alias('mx'), col('qty').cumCount().alias('c')), polars: "t['orders'].select(pl.col('qty').cum_sum().alias('s'), pl.col('qty').cum_min().alias('mn'), pl.col('qty').cum_max().alias('mx'), pl.col('qty').cum_count().alias('c'))" },
  { id: 'cum-over', fn: 'cumSum', df: o().select('id', col('qty').cumSum().over('region', { orderBy: 'price' }).alias('s')), polars: "t['orders'].select('id', pl.col('qty').cum_sum().over('region', order_by='price').alias('s'))" },
  { id: 'shift', fn: 'shift', df: o().select(col('qty').shift().alias('prev'), col('qty').shift(-2, 0).alias('next2')), polars: "t['orders'].select(pl.col('qty').shift().alias('prev'), pl.col('qty').shift(-2, fill_value=0).alias('next2'))" },
  { id: 'rank', fn: 'rank', df: o().select(col('price').rank().alias('min'), col('price').rank({ method: 'dense', descending: true }).alias('dense'), col('price').rank({ method: 'ordinal' }).alias('ord')), polars: "t['orders'].select(pl.col('price').rank('min').alias('min'), pl.col('price').rank('dense', descending=True).alias('dense'), pl.col('price').rank('ordinal').alias('ord'))" },
  { id: 'rank-default', fn: 'rank', df: o().select(col('price').rank()), polars: "t['orders'].select(pl.col('price').rank())", differs: "`rank()` is `min` by default in smaltdf, an integer; Polars' default is `average`, a real." },

  // Reshaping
  { id: 'pivot', fn: 'pivot', df: table('scores').pivot('subject', { index: 'name', values: 'score', maintainOrder: true }), polars: "t['scores'].pivot('subject', index='name', values='score', aggregate_function='first', maintain_order=True)", differs: 'Without `columns`, smaltdf orders the new columns by value; Polars by first appearance.' },
  { id: 'pivot-columns', fn: 'pivot', df: table('scores').pivot('subject', { index: 'name', values: 'score', columns: ['math', 'art', 'music'], maintainOrder: true }), polars: "t['scores'].pivot('subject', index='name', values='score', aggregate_function='first', maintain_order=True)" },
  { id: 'pivot-sum', fn: 'pivot', df: table('scores').pivot('subject', { index: 'name', values: 'score', aggregate: 'sum', columns: ['math', 'art', 'music'], maintainOrder: true }), polars: "t['scores'].pivot('subject', index='name', values='score', aggregate_function='sum', maintain_order=True)" },
  { id: 'unpivot', fn: 'unpivot', df: table('wide').unpivot({ index: 'id' }), polars: "t['wide'].unpivot(index='id')", differs: "smaltdf gives each row's columns together (row by row); Polars gives each column's rows together (column by column)." },
  { id: 'unpivot-unordered', fn: 'unpivot', df: table('wide').unpivot({ index: 'id' }), polars: "t['wide'].unpivot(index='id')", ordered: false },
];
