# smaltdf reference (v0)

Draft: the part of the language that steps 2–5 of [DESIGN.md](DESIGN.md) implement, with the owner's decisions of
2026-11-07.

## Frames

A frame describes rows with named, typed columns. Building a frame runs nothing.

```ts
import { col, lit, table } from '@smaltdb/df';

const big = table('orders')
  .filter(col('qty').gt(10))
  .withColumns(col('qty').mul(col('price')).alias('total'))
  .sort('total', { descending: true })
  .head(5);

const result = await big.collect(db); // db: a smaltdb Database, in process or through the worker
```

| Method | Meaning |
|---|---|
| `table(name)` | The rows of a table, in storage order (rowid order for row tables). |
| `select(...exprs)` | One column per expression, in that order. A string is `col(name)`. |
| `withColumns(...exprs)` | The frame's columns, with these added at the end or replacing a column of the same name in place. |
| `filter(...predicates)` | The rows where every predicate is true (not false, not null). Keeps order. |
| `sort(by, { descending?, nullsLast? })` | Rows ordered by one or more expressions. Stable: equal rows keep their order. Nulls first by default. |
| `head(n)`, `tail(n)`, `slice(offset, n?)` | The first `n` rows, the last `n`, or `n` from `offset`. |
| `collect(db)` | Runs the frame. Resolves to `{ columns, types, rows }` and a `toObjects()` helper. |
| `plan()` | The plan statement (`PlanStatementInput`) the frame runs as. |

A column name that doesn't exist, or an expression of the wrong type for its method, is an error when the frame's
plan is built (`plan` or `collect`, before anything runs): the columns come from the database's catalog. The error
names the method (`filter: no column "qtty" in orders (columns: id, qty, price)`), and so do the engine's errors
while it runs (`select: add: integer overflow in add_checked`).

## Expressions

| Expression | Meaning | Engine operation |
|---|---|---|
| `col(name)` | A column of the frame. | column reference |
| `lit(value)` | A constant: number, bigint, string, `Uint8Array`, boolean, `null`. | literal |
| `a.add(b)`, `.sub`, `.mul` | Arithmetic; int with int stays int, any real makes real. Integer overflow is an error. | `add_checked`, `sub_checked`, `mul_checked` |
| `a.div(b)` | True division: always real. `7 / 2` is `3.5`. A non-zero value divided by zero is `Infinity` or `-Infinity`; `0 / 0` is null *(NaN once the engine keeps NaN)*. | `div_float` |
| `a.floorDiv(b)` | Division rounded toward negative infinity: `-7 // 2` is `-4`. | `div_floor` |
| `a.mod(b)` | Remainder with the sign of the divisor: `-7 % 2` is `1`. | `mod_floor` |
| `a.eq(b)`, `.ne`, `.lt`, `.le`, `.gt`, `.ge` | Comparison. With a null operand the result is null. | `cmp_eq` … |
| `a.eqMissing(b)` | Equality where null equals null. | `cmp_is` |
| `a.and(b)`, `.or(b)`, `.not()` | Logic with nulls (null and false is false; null or true is true). | `and`, `or`, `not` |
| `a.isNull()`, `.isNotNull()` | Null tests; never null. | null test |
| `a.cast(type)` | Conversion to `int`, `real`, `text`, `blob`. A value that doesn't convert is an error. | `cast_integer_strict`, `cast_real_strict`, `cast_text`, `cast_blob` |
| `a.alias(name)` | The same expression under another name. | — |
| `a.round(digits)` | Rounding half to even. | `round_half_even` |
| `a.str.lower()`, `.upper()` | Unicode case mapping. | `lower_unicode`, `upper_unicode` |
| `a.str.contains(pattern)` | Whether a regular expression matches anywhere in the text. | `regex_match` |

Comparisons and logic have type `bool` in smaltdf; `collect` gives `true` / `false`.

## Aggregation

```ts
import { col, len, table } from '@smaltdb/df';

table('orders').groupBy('region').agg(col('qty').sum(), col('price').mean().alias('avg_price'), len());
table('orders').select(col('qty').sum(), col('qty').max().alias('top')); // one row
```

`groupBy(...keys, { maintainOrder? })` then `.agg(...exprs)` gives one row per distinct key: the keys first (names or
expressions), then one column per expression. Groups come in no particular order unless `maintainOrder: true`, which
gives them in order of each group's first row.

An expression in `agg` is made of aggregates (`col('qty').sum().div(len())`) and the keys (`col('region').str.upper()`);
any other column is an error, since a group has many of its values. A `select` whose expressions are all aggregates
(and literals) is one row over every row. Aggregates anywhere else (`filter`, `withColumns`) are an error.

| Aggregate | Meaning | Type | Engine operation |
|---|---|---|---|
| `sum()` | Sum of the non-null values; 0 when there are none (also for a group whose values are all null). | its input's: int or real | `sum`, then `coalesce` with 0 |
| `mean()` | Mean of the non-null values; null when there are none. | real | `avg` |
| `min()`, `max()` | Smallest, largest; null when there are none. | its input's | `min`, `max` |
| `count()` | Number of non-null values. | int | `count` |
| `len()` | Number of rows (a function, not a method: `len()`). | int | `count` of all rows |
| `first()`, `last()` | The first, last value in the group's order. | its input's | `first`, `last` |
| `median()` | The median of the non-null values. | real | `median` |
| `std()`, `var()` | The sample standard deviation and variance. | real | `stddev_samp`, `var_samp` |

A column is named after its input column (`col('qty').sum()` is `qty`; `len()` is `len`). An integer `sum` that
overflows is an error, as integer arithmetic is.

`unique({ subset?, keep?, maintainOrder? })` keeps one row per distinct value of `subset` (one name or several; all
columns by default): the first (`keep: 'first'`, the default) or the last of each. Rows come in no particular order
unless `maintainOrder: true`.

## Joins

```ts
import { col, concat, table } from '@smaltdb/df';

table('orders').join(table('customers'), { on: 'cust', how: 'left' });
table('trades').joinAsof(table('quotes'), { on: 't', by: 'sym' });
concat([table('jan'), table('feb')]);
```

`join(other, { on | leftOn and rightOn, how?, suffix?, maintainOrder? })` matches rows whose keys are equal. A null key
matches nothing. Keys compare as comparisons do: numbers with numbers, text with text.

| `how` | Rows |
|---|---|
| `inner` (default) | Each pair of matching rows |
| `left` | Those, and each left row without a match, with nulls for the right columns |
| `right` | Those, and each right row without a match, with nulls for the left columns |
| `full` | Both of the above |
| `semi` | The left rows that have a match, once each; the left columns only |
| `anti` | The left rows that have none; the left columns only |
| `cross` | Every left row with every right row; no keys |

The result has the left columns, then the right's. Keys named by `on` appear once: the left side's, the right's for
`right`, and whichever side has one for `full`. With `leftOn` / `rightOn` (names or expressions) both sides' columns
stay. A right column whose name the left side has takes `suffix` (default `_right`); if that name is taken too, it is
an error.

Order: `semi` and `anti` keep the left side's order. The others give rows in no particular order unless
`maintainOrder: true`: the left side's order, each left row's matches in the right side's order, and for `right` and
`full` the unmatched right rows last.

`joinAsof(other, { on | leftOn and rightOn, by?, strategy?, tolerance?, suffix? })` gives each left row, in the left
order, the right row whose key is nearest its own: `backward` (default) the last at or before it, `forward` the first
at or after it, `nearest` the closest (ties to the smaller key). `by` names columns of both sides that must also be
equal; `tolerance` is the largest distance between the keys. Without a match the right columns are null. The right
side's `on` and `by` columns are not repeated.

`concat(frames)` gives the first frame's rows, in its order, then the next frame's, and so on. The frames have the
same column names, in the same order, and each column has one type.

## Windows

```ts
table('sales').withColumns(
  col('amt').sum().over('shop').alias('shop_total'),
  col('amt').cumSum().over('shop', { orderBy: 't' }).alias('running'),
  col('amt').rank({ descending: true }).over('shop').alias('rank_in_shop'),
);
table('sales').filter(col('amt').rank({ method: 'ordinal', descending: true }).over('shop').eq(1)); // top per shop
```

A window computes a value for every row from the rows around it, and never moves rows: the result has the frame's
rows in the frame's order. Windows are used in `select`, `withColumns` and `filter`.

`expr.over(partitionBy?, { orderBy?, descending? })` computes `expr`, one aggregate or window function, per partition
(the rows with equal `partitionBy` values; none: all rows). `orderBy` orders each partition for the functions that
follow an order. Without it they follow the frame's order.

| Function | Meaning | Engine operation |
|---|---|---|
| an aggregate, `.over(…)` | The aggregate of the row's partition (as in `agg`: `sum` of no values is 0). `first` / `last` follow `orderBy`. | the aggregate over the whole partition |
| `cumSum()`, `cumMin()`, `cumMax()` | Running sum, minimum, maximum of the non-null values so far; null where the value is null. | `sum`, `min`, `max` over the rows so far |
| `cumCount()` | The number of non-null values so far. | `count` over the rows so far |
| `shift(n = 1, fill = null)` | The value `n` rows earlier (`n` rows later for a negative `n`), or `fill` where there is none. | `lag`, `lead` |
| `rank({ method?, descending? })` | The value's rank: `min` (default; ties share the lowest rank), `dense` (ranks without gaps), `ordinal` (ties by order). Null values rank null. Orders by its own value, so `over` takes no `orderBy`. | `rank`, `dense_rank`, `row_number` |

A window function without `over` works on all rows, in the frame's order. An aggregate without `over` is an error
outside `agg` and a select of aggregates.

Cost: windows with the same partition, order and frame are computed together. When a window has an order, the rows
are numbered first and put back in place after, so a frame keeps its order.

## Reshaping

```ts
table('scores').pivot('subject', { index: 'name', values: 'score', aggregate: 'sum' });
table('wide').unpivot({ index: 'id' });
table('orders').sample({ n: 100, seed: 1 });
```

`pivot(on, { index, values, aggregate?, columns?, maintainOrder? })` gives one row per distinct `index` value (one
column name or several), then one column per value of `on`, named by it (`null` for a null value). Each cell is
`aggregate` (`first` by default; also `last`, `sum`, `mean`, `min`, `max`, `count`, `len`, `median`) of the `values`
of the rows with that index and that value of `on`; a cell with no rows is null, or 0 for `sum` and `count`.
`columns` gives the values of `on` that become columns, in order. Without it, the values are read from the frame (as
it is at the pivot) before it runs, sorted. Rows come in no particular order unless `maintainOrder: true`.

`unpivot({ index?, on?, variableName?, valueName? })` gives, for each row, one row per column of `on`: the `index`
columns, the column's name (`variable` by default), then its value (`value`), in the frame's order and then the
columns' order. `on` defaults to the columns `index` doesn't name, and `index` to those `on` doesn't. A null value
gives a row too.

`sample({ n | fraction, withReplacement?, seed? })` draws rows at random: `n` of them (all, when there are fewer), or
that `fraction`. Without replacement the rows are distinct and keep their order; with it, each draw is any row, in the
order drawn. The same `seed` draws the same rows; without one, each run draws anew.

## Data from JavaScript

```ts
import { frame } from '@smaltdb/df';

frame({ id: new Int32Array([1, 2, 3]), name: ['a', 'b', null], score: [1.5, 2, null] }).filter(col('score').gt(1));
```

`frame(columns)` gives rows from JavaScript data: one column per key, all of one length. A column is a typed array
(`Int8Array` … `Uint32Array` and `BigInt64Array` are `int`; `Float32Array` and `Float64Array` are `real`, where NaN
reads as null) or an array of values of one kind: numbers (`int` when all are integers, else `real`), bigints
(`int`), strings (`text`), booleans (`bool`) or `Uint8Array`s (`blob`); `null` and `undefined` are null. An integer in
the safe range comes back as a number. A frame of data joins tables and takes every method. Through the client, typed
arrays cross to the worker as binary data.

## Writing

```ts
import { col, deleteFrom, frame, table, update } from '@smaltdb/df';

await frame({ id: [4, 5], name: ['cup', 'mug'] }).insertInto(db, 'items');
await table('items').groupBy('name').agg(col('qty').sum()).createTable(db, 'totals');
await update('items', { set: { qty: col('qty').add(1) }, where: col('id').eq(4) }).run(db);
await deleteFrom('items', { where: col('qty').eq(0) }).run(db);
```

Each resolves to `{ rows }`: the number of rows written, changed or deleted.

`frame.insertInto(db, table, { onConflict? })` writes the frame's rows into `table` by column name; the table's other
columns take their defaults. Each frame column must fit its table column: `int` and `bool` into an `INTEGER`, `REAL`
or `NUMERIC` column, `real` into `REAL` or `NUMERIC`, `text` into `TEXT`, `blob` into `BLOB`, anything into `ANY`.
A row that breaks a constraint undoes the whole write (`onConflict: 'abort'`, the default), is skipped (`ignore`),
or replaces the row it conflicts with (`replace`).

`frame.createTable(db, name, { storage?, ifNotExists? })` makes a table with the frame's columns and types (`int` and
`bool` as `INTEGER`, `real` as `REAL`, `num` as `NUMERIC`, `text` as `TEXT`, `blob` as `BLOB`, others as `ANY`; a
`bool` column reads back as `int`) and writes the frame's rows into it, in one transaction: if the rows fail, there is
no table. `storage` is `row` (default) or `columnar`. With `ifNotExists`, an existing table is left as it is and
nothing is written.

`update(table, { set, where?, onConflict? }).run(db)` sets each column of `set` (a name to an expression or a value)
in the rows `where` is true for, all rows without it; the expressions read the row as it was before the update.
`deleteFrom(table, { where? }).run(db)` deletes the rows `where` is true for, or all. Both have `plan(db)`.

## Views

```ts
import { registerLanguage } from 'smaltdb/engine'; // in a worker entry: defineWorker({ languages: [dfLanguage] })
import { col, dfLanguage, refreshView, table } from '@smaltdb/df';

registerLanguage(dfLanguage);
await table('orders').filter(col('qty').gt(5)).createView(db, 'big');
await table('big').join(table('regions'), { on: 'region' }).collect(db);
await table('orders').groupBy('region').agg(col('qty').sum()).createView(db, 'totals', { materialized: true });
await refreshView(db, 'totals');
```

`frame.createView(db, name, { materialized?, ifNotExists? })` stores the frame by name. `table(name)` reads it as it
reads a table, and its rows follow the tables it reads. A materialized view keeps its rows until `refreshView(db,
name)`.

A view is stored as smaltdf's own serialized frame, with its columns, and is bound where a plan reads it by
`dfLanguage`: register it where the engine runs, with `registerLanguage(dfLanguage)` in process or
`defineWorker({ languages: [dfLanguage] })` in a worker entry. A view reads tables and views, not data from JavaScript
(`frame(…)`), and a pivot in it keeps the columns it had when the view was made. Views of other languages can be read
when they give their column names (their types are then `any`).

## Not yet in the language

Dates and times, lists and structs follow the engine's types (smaltdb ADR 0016 step 11). The Polars comparison tests
are step 9 of [DESIGN.md](DESIGN.md).
