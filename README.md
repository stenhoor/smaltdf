<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/logos/smaltdf/lockup-on-dark.svg">
    <img alt="smaltdf" src="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/logos/smaltdf/lockup.svg" width="320">
  </picture>
</h1>

**Small. Alternative. Frames.**

Dataframes for [smaltdb](https://github.com/stenhoor/smaltdb). Small and fast.

smaltdf builds queries from dataframe expressions and runs them in the smaltdb engine: each lazy frame compiles to
one SQL statement, so the engine's planner, row and columnar tables, and spilling sorts and aggregates do the work.
Results come back as columns of typed arrays. No dependencies.

> **Status: 0.1.0, preview.** Lazy and eager frames, expressions, `groupBy`, joins, windows and ranks. Not on npm
> yet; see [Development](#development).

```ts
import { open } from 'smaltdb';
import { smaltdf, col, len } from '@smaltdb/df';

const db = await open('shop');
const pl = smaltdf(db);

const top = await pl
  .scanTable('orders')
  .filter(col('qty').gt(0))
  .withColumns(col('qty').mul(col('price')).alias('revenue'))
  .groupBy('region')
  .agg(col('revenue').sum(), len().alias('orders'))
  .sort('revenue', { descending: true })
  .collect();

top.toDicts(); // [{ region: 'north', revenue: 412.5, orders: 31 }, …]
top.getColumn('revenue'); // Float64Array
```

`explain()` shows the statement a frame runs:

```ts
await pl.scanTable('orders').filter(col('qty').gt(0)).groupBy('region').agg(col('qty').sum()).explain();
// SELECT "_t0"."region" AS "region", sum("_t0"."qty") AS "qty" FROM "orders" AS "_t0"
//   WHERE ("_t0"."qty" > ?1) GROUP BY "_t0"."region"
// -- params: [0]
```

## Install

```sh
npm install smaltdb @smaltdb/df
```

smaltdf runs on the client `Database` from `smaltdb` (the engine in a worker) and on the in-process engine from
`smaltdb/engine` (Node, tests). It is a library only: nothing is installed into the engine.

## Frames

| | |
| --- | --- |
| `pl.scanTable(name)`, `pl.scanSql(sql, params)` | A `LazyFrame` over a table, a view, or a SELECT statement. |
| `pl.DataFrame({ a: [1, 2] })`, `pl.fromDicts(rows)` | A `DataFrame` from JavaScript data. It is placed in a temporary table the first time a query uses it. |
| `pl.readTable(name)`, `pl.readDatabase(sql, params)` | Run and collect at once. |
| `lf.collect()` | Run the query: a `DataFrame` with `columns`, `schema`, `shape`, `getColumn()`, `toDicts()`, `rows()`. |
| `df.lazy()` | Continue from collected data. Eager methods (`df.filter(…)`) do the same and return a `Promise<DataFrame>`. |

LazyFrame methods: `select`, `withColumns`, `filter`, `groupBy(…).agg(…)` (and `.len()`, `.sum()`, `.mean()`, …),
`sort`, `head`, `tail`, `slice`, `join` (`inner`, `left`, `right`, `full`, `semi`, `anti`, `cross`), `unique`, `rename`,
`drop`, `dropNulls`, `fillNull`, `withRowIndex`, `collectSchema`, `explain`.

Expressions: `col`, `lit`, `when/then/otherwise`, `len`, arithmetic (`add`, `sub`, `mul`, `truediv`, `floordiv`,
`mod`), comparisons (`eq`, `ne`, `lt`, `le`, `gt`, `ge`, `eqMissing`), `and`, `or`, `not`, `isNull`, `fillNull`, `isIn`,
`isBetween`, `cast`, `abs`, `round`, `floor`, `ceil`, `clip`; math with `sqrt`, `pow`, `exp`, `log`, `log10`,
`sin`, `cos`, `tan`, `arcsin`, `arctan`, `sinh`, `tanh`, `degrees`, `radians` and more; aggregates `sum`, `mean`, `min`, `max`, `count`, `len`,
`nUnique`, `var`; windows with `over(…)` and `rank(method)`; strings with `str.lenChars`, `str.toUppercase`,
`str.contains`, `str.startsWith`, `str.slice`, `str.replaceAll`, `str.stripChars` and more; output names with
`alias` and `name.suffix` / `name.prefix`.

## API compatibility

The API follows the Polars expression API. Method and argument names are Polars' Python names in camelCase
(`with_columns` → `withColumns`, `str.to_uppercase` → `str.toUppercase`, `nulls_last=True` → `{ nullsLast: true }`),
and output column names follow the same rules.

Results are checked against Python Polars by differential tests: generated programs run in both, and their results
must match. They run on every backend (the in-process engine and the worker client, each with row and columnar
tables, and JavaScript data), and give the same results on all of them. Where an operation maps onto SQL, smaltdf
returns what smaltdb's SQL returns. The differences are listed, with portable forms, in
[docs/divergences.md](docs/divergences.md). Examples: integer `truediv` truncates, `round` rounds halves away from
zero, `sum()` of no values is NULL, and `pl.DataFrame({ x: [1.0, 2.0] })` is `Int64` unless a schema says `Float64`.

## Development

Requires Node 20+ and, for the differential tests, Python 3 with `polars` (`pip install polars`).

```sh
npm ci && npm run deps   # deps: the pinned smaltdb build from packed.json (until 0.9.0 is on npm)
npm run check            # type-check and test
SMALTDF_SEED=7 SMALTDF_CASES=2000 npx vitest run test/differential.test.ts   # more generated cases
```

See [CLAUDE.md](CLAUDE.md) and [docs/DESIGN.md](docs/DESIGN.md). MIT licence.
