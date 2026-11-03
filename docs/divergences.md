# Differences from Polars

smaltdf follows the Polars API. Where a Polars operation maps onto a SQL operator or function, smaltdf returns what
smaltdb's SQL returns ([DESIGN.md](DESIGN.md), decision 5). Where Polars defines an operation that has no SQL
counterpart (`floordiv`, `n_unique`, `rank`, `is_between`, `str.starts_with`, …), smaltdf implements Polars'
definition.

## Backends

smaltdf runs on these smaltdb backends. Every differential case (generated programs compared with Python Polars) and
every divergence below runs on each of them, and on JavaScript data:

| Backend | What it is | Tested by |
| --- | --- | --- |
| Engine, row table | `Database` from `smaltdb/engine` (in-process: Node, tests, your own worker); a table stored as a B+tree | `test/differential.test.ts`, `test/divergences.test.ts` |
| Engine, columnar table | The same, with `WITH (storage = 'columnar')`: compressed column segments and zone maps | the same |
| Client, row table | `Database` from `smaltdb` (the engine in a worker); results cross the worker's columnar wire protocol | the same, with the engine server in-process ([`test/backends.ts`](../test/backends.ts)) |
| Client, columnar table | The client with a columnar table | the same |
| JavaScript data | `pl.DataFrame(…)`, placed in a temporary row table on whichever database it is bound to | the same |

**Results are the same on every backend.** No case, generated or pinned, gives a different value, type or JavaScript
representation on one backend than on another. The differences from Polars below therefore apply to all of them.
The one place where the way data reaches the engine matters is [JavaScript data](#javascript-data).

The client backends are tested with smaltdb's engine server in the same process, through the same protocol code as
a browser worker. The tests do not yet run in a browser, so OPFS storage and a real `Worker` are not covered.

## Results {#results}

The cases below give different results from Polars, on every backend. Each one is pinned in
[`test/divergences.test.ts`](../test/divergences.test.ts), which checks smaltdf's result on every backend and Polars'
result, so a change on either side fails that test. The generated differential tests leave these operations out.

| Id | Operation | smaltdf (smaltdb) | Polars | Portable form |
| --- | --- | --- | --- | --- |
| `integer-division` | `col('a').truediv(col('b'))` with two integer columns | Integer division, truncated toward zero: `7 / 2 = 3`. Division by zero gives NULL. | Always a float: `3.5`. Division by zero gives `inf`. | Cast one side: `col('a').cast(Float64).truediv(col('b'))`. Use `floordiv` for floored integer division; it matches Polars. |
| `float-division-by-zero` | `truediv` of a float by zero | NULL | `inf`, `-inf`, or `NaN` for `0 / 0` | — |
| `modulo-sign` | `col('a').mod(col('b'))` | The remainder has the sign of the dividend: `-7 % 2 = -1`. | The sign of the divisor: `-7 % 2 = 1`. | Same results for non-negative operands. |
| `round-half` | `round(decimals)` | Halves round away from zero: `2.5 → 3`, `0.125 → 0.13`. | Halves round to even: `2.5 → 2`, `0.125 → 0.12`. | — |
| `integer-overflow` | Integer arithmetic or `sum()` beyond 64 bits | `+`, `-`, `*` give a REAL (`2^62 * 2 = 9.223372036854776e18`); `sum()` fails with `integer overflow`. | Wraps around: `2^62 * 2 = -2^63`. | Cast to `Float64` first when values can be that large. |
| `sum-of-nothing` | `sum()` over no rows, or over only NULLs | NULL | `0` | `col('a').sum().fillNull(0)` |
| `nan-is-null` | Math functions outside their domain: `sqrt(-1)`, `log(0)`, `arcsin(2)` | NULL | `NaN`, or `-inf` for `log(0)` | Filter or `when` on the argument's domain. |
| `sort-nulls-default` | `sort(…)` without `nullsLast` | NULLs first when ascending, last when descending. | NULLs first in both directions. | Pass `nullsLast` explicitly: smaltdf then matches Polars. |
| `cast-text-to-number` | `col('s').cast(Int64)` on text that is not a number | `0` (SQL `CAST`) | An error (`InvalidOperationError`); NULL with `strict=False` | — |
| `unsigned-lengths` | `str.lenChars()`, `str.lenBytes()` | `Int64`: arithmetic can go below zero. | `UInt32`: arithmetic below zero wraps around. | `str.lenChars().cast(Int64)` in Polars gives smaltdf's result. |

## JavaScript data {#javascript-data}

`pl.DataFrame(…)`, `pl.fromDict(…)` and `pl.fromDicts(…)` take JavaScript values, which carry less type information
than a table's declared types. Data that is already in a table (any backend) is typed by its columns and has none of
these issues. Tested in `test/frame.test.ts`.

| Input | smaltdf | Polars | What to do |
| --- | --- | --- | --- |
| Integer-valued numbers, `[1.0, 2.0]` | `Int64`: JavaScript has no separate `1.0`, so `truediv` then truncates (see `integer-division`). | `Float64` | Pass a schema (`pl.DataFrame(data, { schema: { x: Float64 } })`) or a `Float64Array`. |
| `NaN` | Stored as NULL: `isNull()` is true and `sum()` skips it. | A float value distinct from null; `sum()` is `NaN`. | — |
| Integers beyond 2^53 | Exact as `bigint`; an `Int64` schema turns unsafe integer numbers into `bigint`. | Exact `Int64` | Use `bigint` or an `Int64` schema. |
| `Date` objects | ISO 8601 text (`String`) | `Datetime` | Date and time types are not supported yet. |
| `true` / `false` | `Boolean`, stored as 1 / 0 | `Boolean` | — |

## Representation {#representation}

How values come back, the same on every backend:

- **Columns** (`getColumn()`): a `Float64Array` when every value is a number, including integer columns and the
  columns of an empty result, whatever their type; otherwise an array of values. Integers beyond 2^53 come back as
  `bigint`, so a column holding one is an array.
- **Booleans** are stored and computed as 1 and 0 (smaltdb has no boolean type). Columns whose type is `Boolean`
  (comparisons, `isNull()`, `BOOLEAN` table columns, JavaScript booleans) come back as `true` / `false`; an `INTEGER`
  table column holding 0 and 1 stays `Int64`.
- **Lists, structs, dates and times** have no smaltdf type yet. Operations that would produce a list column (a
  column that is not aggregated in `groupBy().agg()`) fail with `InvalidOperationError`.
- **Row order**: as in Polars, `groupBy` and `unique` return rows in no particular order, which may change between
  backends and versions; sort when order matters.

## Not supported yet

These fail with `InvalidOperationError`, naming the engine feature they need (see the open items in
[DESIGN.md](DESIGN.md)): `std`, `median` and `quantile` (smaltdb's statistics aggregates, in progress), `first`, `last`,
regular-expression patterns in `str.contains` / `str.replace` / `str.replaceAll` (literal patterns work), `nUnique()`
over a window, `unique(keep=…)` other than `'any'`, and `maintainOrder`.
