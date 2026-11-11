# smaltdf reference (v0)

Draft: the part of the language that steps 2–9 of [DESIGN.md](DESIGN.md) implement, with the owner's decisions of
2026-11-07.

## Frames

A frame describes rows with named, typed columns. Building a frame runs nothing.

```ts
import { col, lit, table } from '@smaltworks/smaltdf';

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
| `sort(by, { descending?, nullsLast? })` | Rows ordered by one or more expressions. Stable: equal rows keep their order. Nulls first by default. NaN sorts after every number, Infinity included. |
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
| `lit(value)` | A constant: number, bigint, string, `Uint8Array`, boolean, JS `Date` (a `datetime`), `null`. | literal |
| `a.add(b)`, `.sub`, `.mul` | Arithmetic; int with int stays int, any real makes real. Integer overflow is an error. | `add_checked`, `sub_checked`, `mul_checked` |
| `a.div(b)` | True division: always real. `7 / 2` is `3.5`. A non-zero value divided by zero is `Infinity` or `-Infinity`; `0 / 0` is NaN. | `div_float` |
| `a.floorDiv(b)` | Division rounded toward negative infinity: `-7 // 2` is `-4`. | `div_floor` |
| `a.mod(b)` | Remainder with the sign of the divisor: `-7 % 2` is `1`. | `mod_floor` |
| `a.eq(b)`, `.ne`, `.lt`, `.le`, `.gt`, `.ge` | Comparison. With a null operand the result is null. | `cmp_eq` … |
| `a.eqMissing(b)` | Equality where null equals null. | `cmp_is` |
| `a.and(b)`, `.or(b)`, `.not()` | Logic with nulls (null and false is false; null or true is true). | `and`, `or`, `not` |
| `a.isNull()`, `.isNotNull()` | Null tests; never null. | null test |
| `a.cast(type)` | Conversion to `int`, `real`, `text`, `blob`, `date`, `datetime`. A value that doesn't convert is an error. | `cast_integer_strict`, `cast_real_strict`, `cast_text`, `cast_blob`, `cast_date`, `cast_datetime` |
| `a.alias(name)` | The same expression under another name. | — |
| `a.round(digits)` | Rounding half to even. | `round_half_even` |
| `a.str.lower()`, `.upper()` | Unicode case mapping. | `lower_unicode`, `upper_unicode` |
| `a.str.contains(pattern)` | Whether a regular expression matches anywhere in the text. | `regex_match` |

Comparisons and logic have type `bool` in smaltdf; `collect` gives `true` / `false`.

## Dates and times

Four types hold dates and times ([smaltdb ADR 0019](https://smaltdb.dev/adr/0019-dates-and-times)), to the µs:

| Type | Holds | `collect` gives |
|---|---|---|
| `date` | a calendar date | text, `2026-11-07` |
| `datetime` | a date and time of day, with no zone | a JS `Date` (ms) |
| `time` | a time of day | text, `13:04:05.678` |
| `duration` | a span of time | ISO 8601 text, `P1DT2H30M` |

A column of JS `Date`s in `frame(...)`, and `lit(new Date(...))`, are `datetime`s. A table that `createTable` makes
stores them as `DATE`, `DATETIME`, `TIME` and `DURATION`.

| Expression | Meaning | Engine operation |
|---|---|---|
| `a.dt.year()`, `.month()`, `.day()` | Parts of a `date` or `datetime`. | `year`, `month`, `day` |
| `a.dt.weekday()`, `.ordinalDay()` | The ISO weekday (Monday is 1), the day of the year. | `weekday`, `day_of_year` |
| `a.dt.hour()`, `.minute()`, `.second()`, `.microsecond()` | Parts of a `datetime` or `time`; `microsecond` is the µs within the second. | `hour` … |
| `a.dt.date()` | The date of a `datetime`. | `cast_date` |
| `a.dt.truncate(every)` | The start of its `1y`, `1q`, `1mo`, `1w` (Monday), `1d`, `1h`, `1m`, `1s`, `1ms` or `1us`. | `trunc_temporal` |
| `a.dt.offsetBy(by)` | Moved by text such as `1mo`, `-2d` or `1y3mo` (`y`, `q`, `mo`, `w`, `d`, `h`, `m`, `s`, `ms`, `us`), or by a `duration`. Months keep the day of the month, or take the last day of a shorter one. | `offset_by` |
| `a.dt.strftime(format)` | Text written with a `strftime` format. | `format_temporal` |
| `a.str.toDate(format?)`, `.str.toDatetime(format?)` | Text read as a date: in the result format, or with a `strftime` format. Text that doesn't read is an error. | `cast_date`, `parse_date`, … |
| `a.dt.toZone(zone)` | The wall-clock time in `zone` of a UTC instant. | `to_zone` |
| `a.dt.fromZone(zone, { ambiguous? })` | The UTC instant of a wall-clock time in `zone`. A time that occurs twice is the earliest unless `ambiguous` is `latest` or `raise`; one that doesn't occur moves forward. | `from_zone` |
| `a.dt.zoneOffset(zone)` | The zone's offset from UTC at a UTC instant, a `duration`. | `zone_offset` |

- **Zones:** a zone is an IANA name (`Europe/Paris`), `UTC` or an offset (`+05:30`). It is any expression, so a
  column of zones gives each row its own. A `datetime` carries no zone: the data says whether it is a UTC instant or a
  wall-clock time.
- **Arithmetic:** `datetime - datetime`, `date - date` and `time - time` are `duration`s. A `datetime` plus or minus a
  `duration` is a `datetime`. Durations add, multiply by an `int` and `sum`. Other arithmetic on dates and times is an
  error: move a `date` with `dt.offsetBy`.
- **Comparisons:** values of the same type compare. Text compared with a `date` or `datetime` is read as one, and
  text that isn't one is an error: `col('ts').ge('2026-01-01 00:00:00')`.

## Lists and structs

Two kinds of types hold values of other types ([smaltdb ADR 0020](https://smaltdb.dev/adr/0020-lists-and-structs)):
`list<T>`, a list of `T` values, and `struct<name T, …>`, named fields, nested to any depth. `frame(...)` reads a column
of JS arrays as a list and of plain objects as a struct, its type from the values (`[['a'], []]` is `list<text>`, an
all-empty column `list<any>`); `collect` gives them back as arrays and objects. A table that `createTable` makes stores
them as `LIST` and `STRUCT`, and a write into one takes values of its own type only.

| Expression | Meaning | Engine operation |
|---|---|---|
| `a.list.len()` | The number of elements. | `list_len` |
| `a.list.get(i)`, `.first()`, `.last()` | The element at `i` (from 0; negative from the end), or null out of range. | `list_get` |
| `a.list.contains(v)` | Whether an element equals `v`. | `list_contains` |
| `a.list.slice(offset, length?)`, `.head(n)`, `.tail(n)` | Elements from `offset` (negative from the end). | `list_slice` |
| `a.list.concat(b)` | `a`'s elements, then `b`'s. | `list_concat` |
| `a.list.join(sep)` | A list of text's non-null elements joined by `sep`. | `list_join` |
| `a.list.sort({ descending? })` | The elements sorted, nulls first. | `list_sort` |
| `a.list.unique()`, `.reverse()` | Without repeats (the first of each, in order); reversed. | `list_unique`, `list_reverse` |
| `a.list.sum()`, `.mean()`, `.min()`, `.max()` | Over the non-null elements: the sum (0 for none), the mean, the least, the greatest. | `list_sum` … |
| `a.struct.field(name)` | A struct's field. | `struct_field` |
| `a.implode()` | An aggregate: the group's values as a list, in the group's order, nulls included. | `implode` |

| Frame method | Meaning |
|---|---|
| `explode(column, { emptyAsNull?, keepNulls? })` | One row per element of list column `column`, the other columns repeated, in the frame's order then the list's. An empty list gives no row (one row with null with `emptyAsNull`), a null list one row with null (none with `keepNulls: false`). |
| `unnest(column)` | Struct column `column` replaced by one column per field, named as the fields. |

## Aggregation

```ts
import { col, len, table } from '@smaltworks/smaltdf';

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
unless `maintainOrder: true`, which gives them in order of each group's first row (for `keep: 'last'` too).

## Joins

```ts
import { col, concat, table } from '@smaltworks/smaltdf';

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
import { frame } from '@smaltworks/smaltdf';

frame({ id: new Int32Array([1, 2, 3]), name: ['a', 'b', null], score: [1.5, 2, null] }).filter(col('score').gt(1));
```

`frame(columns)` gives rows from JavaScript data: one column per key, all of one length. A column is a typed array
(`Int8Array` … `Uint32Array` and `BigInt64Array` are `int`; `Float32Array` and `Float64Array` are `real`, where NaN
is NaN) or an array of values of one kind: numbers (`int` when all are integers, else `real`), bigints
(`int`), strings (`text`), booleans (`bool`) or `Uint8Array`s (`blob`); `null` and `undefined` are null. An integer in
the safe range comes back as a number. A frame of data joins tables and takes every method. Through the client, typed
arrays cross to the worker as binary data.

## Writing

```ts
import { col, deleteFrom, frame, table, update } from '@smaltworks/smaltdf';

await frame({ id: [4, 5], name: ['cup', 'mug'] }).insertInto(db, 'items');
await table('items').groupBy('name').agg(col('qty').sum()).createTable(db, 'totals');
await update('items', { set: { qty: col('qty').add(1) }, where: col('id').eq(4) }).run(db);
await deleteFrom('items', { where: col('qty').eq(0) }).run(db);
```

Each resolves to `{ rows }`: the number of rows written, changed or deleted.

`frame.insertInto(db, table, { onConflict? })` writes the frame's rows into `table` by column name; the table's other
columns take their defaults. Each frame column must fit its table column: `int` into an `INTEGER`, `REAL` or `NUMERIC`
column, `bool` into those or a `BOOLEAN` one, `real` into `REAL` or `NUMERIC`, `text` into `TEXT`, `blob` into
`BLOB`, anything into `ANY`.
A row that breaks a constraint undoes the whole write (`onConflict: 'abort'`, the default), is skipped (`ignore`),
or replaces the row it conflicts with (`replace`).

`frame.createTable(db, name, { storage?, ifNotExists? })` makes a table with the frame's columns and types (`int` and
`bool` as `BOOLEAN`, `real` as `REAL`, `num` as `NUMERIC`, `text` as `TEXT`, `blob` as `BLOB`, others as `ANY`) and writes the frame's rows into it, in one transaction: if the rows fail, there is
no table. `storage` is `row` (default) or `columnar`. With `ifNotExists`, an existing table is left as it is and
nothing is written.

`update(table, { set, where?, onConflict? }).run(db)` sets each column of `set` (a name to an expression or a value)
in the rows `where` is true for, all rows without it; the expressions read the row as it was before the update.
`deleteFrom(table, { where? }).run(db)` deletes the rows `where` is true for, or all. Both have `plan(db)`.

## Views

```ts
import { registerLanguage } from 'smaltdb/engine'; // in a worker entry: defineWorker({ languages: [dfLanguage] })
import { col, dfLanguage, refreshView, table } from '@smaltworks/smaltdf';

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

Every type of smaltdb ADR 0016 step 11 is in: `bool` and NaN, dates and times, lists and structs.

## Compared with Polars

Polars inspired smaltdf's functions, and many give the same results. The comparison tests (`compare/`, run in their
own CI job) run each case both ways over the same tables, and fail when a result changes, so the table below stays
true. Order is compared too, except where neither side promises one (`groupBy` and joins without `maintainOrder`).

<!-- compare:begin (written by compare/compare.test.ts: npm run compare with UPDATE=1) -->

With Polars 2.1.0, 72 of the 80 cases give the same columns, types and rows (or both an
error). They cover `filter`, `select`, `withColumns`, `sort`, `head`, `tail`, `slice`, `div`, `floorDiv`, `mod`, `add`, `eq`, `and`, `isNull`, `cast`, `round`, `str.lower`, `str.contains`, `groupBy`, `median`, `sum`, `unique`, `join`, `joinAsof`, `concat`, `over`, `cumSum`, `shift`, `rank`, `pivot`, `unpivot`, `dt.year`, `dt.hour`, `dt.date`, `dt.truncate`, `dt.offsetBy`, `dt.strftime`, `sub`, `gt`, `str.toDatetime`, `str.toDate`, `dt.toZone`, `dt.fromZone`, `list.len`, `list.contains`, `list.sort`, `list.unique`, `list.sum`, `list.join`, `list.slice`, `list.concat`, `explode`, `implode`, `struct.field`, `unnest`.

These differ:

| Function | Difference |
|---|---|
| `add` | An integer overflow is an error in smaltdf (decision E); Polars wraps around. |
| `unique` | With `keep: 'last'` and `maintainOrder`, smaltdf gives the rows in order of each group's first row; Polars in order of the rows it keeps. |
| `join` | A `full` join gives its `on` keys once in smaltdf, from whichever side has them; Polars keeps both sides' (`region`, `region_right`) unless `coalesce=True`. |
| `join` | A `right` join keeps the key column in the left side's place in smaltdf; Polars moves it to just before the right side's other columns. |
| `joinAsof` | `nearest` takes the smaller key when two are equally near in smaltdf; Polars takes the larger. |
| `rank` | `rank()` is `min` by default in smaltdf, an integer; Polars' default is `average`, a real. |
| `pivot` | Without `columns`, smaltdf orders the new columns by value; Polars by first appearance. |
| `unpivot` | smaltdf gives each row's columns together (row by row); Polars gives each column's rows together (column by column). |

<!-- compare:end -->
