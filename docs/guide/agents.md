# For AI agents

This page is for AI agents that write smaltdf, and for people who want the whole language in one place. The site
publishes Markdown for agents, written from the same sources as its pages:

- [`/agents.md`](https://stenhoor.github.io/smaltdf/agents.md): this page, then the grammar, then every reference page,
  errors and the Polars differences, in one file.
- [`/llms.txt`](https://stenhoor.github.io/smaltdf/llms.txt): an index of every page, each as Markdown.
- A Markdown twin of every page: `guide/frames.md` beside `guide/frames`.

## What smaltdf is

- A TypeScript library, `@smaltworks/smaltdf`, with no runtime dependencies. Its peer is `smaltdb`, the engine.
- A frame (`Frame`) describes rows with named, typed columns. Methods return new frames; nothing runs until
  `collect(db)`. Expressions (`Expr`) describe a value per row.
- smaltdf builds plans for smaltdb's plan layer and runs them with `db.queryPlan`. It never writes or runs SQL. Don't
  generate SQL text for smaltdf, and don't look for a method that takes SQL: there is none.

## How to use it

1. Get a database: `Database.openMemory()` from `smaltdb/engine` in Node or tests (after
   `registerLanguage(dfLanguage)` if views are used); in a browser, `open(name, { worker })` from `smaltdb`, with a
   worker entry that calls `defineWorker({ languages: [dfLanguage] })`.
2. Build a frame from `table(name)`, `frame({ column: values })` or `concat([frames])`, then chain methods.
3. Run it: `await f.collect(db)` gives `{ columns, types, rows, toObjects() }`.

## Rules

- **Columns and values.** In `select`, `withColumns`, `sort`, `groupBy`, `unique`, `join({ on })`, `explode`, `unnest`,
  `pivot` and `unpivot`, a string is a column name. In an expression method's operand (`eq`, `add`, `contains` …), a
  string is a text value: use `col(name)` for a column.
- **Names.** An expression is named after the first column it reads; give computed columns names with `.alias(name)`.
  Two columns with one name are an error.
- **Aggregates** (`sum`, `mean`, `min`, `max`, `count`, `first`, `last`, `median`, `std`, `var`, `implode`, `len()`)
  belong in `groupBy(…).agg(…)`, in a `select` of only aggregates, or with `.over(…)`. Elsewhere they are an error. In
  `agg`, a column outside an aggregate must be a key.
- **Windows** (`cumSum`, `cumMin`, `cumMax`, `cumCount`, `shift`, `rank`, and aggregates with `over`) go in `select`,
  `withColumns` and `filter`, never in `agg`. `rank` takes no `orderBy`.
- **Order.** `groupBy`, `unique`, `join` and `pivot` give rows in no particular order: pass `maintainOrder: true` when
  order matters, or `sort` after. `sort` is stable.
- **Nulls.** Comparisons with null are null, and `filter` drops null. Test with `isNull()`, `isNotNull()`, or
  `eqMissing()`. `sum` of no values is 0; `mean`, `min` and `max` are null.
- **Types.** `div` is always `real`; `floorDiv` and `mod` round toward negative infinity. Integer overflow and failed
  conversions are errors, not nulls. `frame()` columns must be of one kind each.
- **Writes** (`createTable`, `insertInto`) need each column to fit its table column: whole numbers make an `INTEGER`
  column, which a `real` doesn't fit.
- **Views** read tables and views, not `frame(…)` data, and need `dfLanguage` registered where the engine runs.
- **Errors** are `DfError`s with a `code` and a message that names the method: `SMALTDF_SCHEMA` (a name),
  `SMALTDF_TYPE` (a type), `SMALTDF_RANGE` (an argument's range), or the engine's (`SMALT_RANGE`, `SMALT_MISMATCH`).

## What isn't in the language

| Not supported | Instead |
| --- | --- |
| SQL text, or a method that takes it | Build the frame with its methods; for SQL itself, use smaltql on the same database |
| Lazy and eager modes | Every frame is lazy: `collect` runs it |
| `apply` / `map` with a JavaScript function per row | Expressions; or `collect`, then JavaScript over `rows` |
| Indexing rows by position on a frame (`iloc`) | `slice(offset, n)`, or `collect` then index `rows` |
| Reading files (`readCsv`, `readParquet`) | Read the data in JavaScript and pass it to `frame({ … })`; smaltql's `read_csv` and `read_parquet` with the plugins |
| A `rank` method `average` | `rank({ method: 'min' \| 'dense' \| 'ordinal' })` |
| Negative offsets in `slice` | `tail(n)` |

## A complete example

```ts
import { col, frame, len } from '@smaltworks/smaltdf';

const orders = frame({ id: [1, 2, 3, 4], region: ['n', 's', 'n', 'e'], qty: [3, 12, 7, null] });
orders
  .filter(col('qty').isNotNull())
  .groupBy('region', { maintainOrder: true })
  .agg(len().alias('orders'), col('qty').sum().alias('units'))
  .sort('units', { descending: true });
```

| region | orders | units |
| --- | --- | --- |
| s | 1 | 12 |
| n | 2 | 10 |
