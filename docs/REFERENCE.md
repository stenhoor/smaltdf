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

## Not yet in the language

Joins, windows, reshaping, data from JavaScript, writes and views follow the order of work in
[DESIGN.md](DESIGN.md). Dates and times, lists and structs follow the engine's types (smaltdb ADR 0016 step 11).
