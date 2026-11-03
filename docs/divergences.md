# Differences from Polars

smaltdf follows the Polars API. Where a Polars operation maps onto a SQL operator or function, smaltdf returns what
smaltdb's SQL returns ([DESIGN.md](DESIGN.md), decision 5). Where Polars defines an operation that has no SQL
counterpart (`floordiv`, `n_unique`, `rank`, `is_between`, `str.starts_with`, …), smaltdf implements Polars'
definition.

The cases below give different results. Each one is pinned in [`test/divergences.test.ts`](../test/divergences.test.ts),
which checks both smaltdf's result and Polars' result, so a change on either side fails that test. The generated
differential tests (`test/differential.test.ts`) leave these operations out.

| Id | Operation | smaltdf (smaltdb) | Polars | Portable form |
| --- | --- | --- | --- | --- |
| `integer-division` | `col('a').truediv(col('b'))` with two integer columns | Integer division, truncated toward zero: `7 / 2 = 3`. Division by zero gives NULL. | Always a float: `3.5`. Division by zero gives `inf`. | Cast one side: `col('a').cast(Float64).truediv(col('b'))`. Use `floordiv` for floored integer division; it matches Polars. |
| `modulo-sign` | `col('a').mod(col('b'))` | The remainder has the sign of the dividend: `-7 % 2 = -1`. | The sign of the divisor: `-7 % 2 = 1`. | Same results for non-negative operands. |
| `round-half` | `round(decimals)` | Halves round away from zero: `2.5 → 3`, `0.125 → 0.13`. | Halves round to even: `2.5 → 2`, `0.125 → 0.12`. | — |
| `sum-of-nothing` | `sum()` over no rows, or over only NULLs | NULL | `0` | `col('a').sum().fillNull(0)` |
| `sort-nulls-default` | `sort(…)` without `nullsLast` | NULLs first when ascending, last when descending. | NULLs first in both directions. | Pass `nullsLast` explicitly: smaltdf then matches Polars. |
| `cast-text-to-number` | `col('s').cast(Int64)` on text that is not a number | `0` (SQL `CAST`) | An error (`InvalidOperationError`); NULL with `strict=False` | — |
| `unsigned-lengths` | `str.lenChars()`, `str.lenBytes()` | `Int64`: arithmetic can go below zero. | `UInt32`: arithmetic below zero wraps around. | `str.lenChars().cast(Int64)` in Polars gives smaltdf's result. |

## Representation

These are not differences in results, but in how values are held:

- **Booleans** are stored and computed as the integers 1 and 0 (smaltdb has no boolean type). A collected
  `DataFrame` gives columns of type `Boolean` as `true` / `false`.
- **Lists, structs, dates and times** have no smaltdf type yet. Operations that would produce a list column (a
  column that is not aggregated in `groupBy().agg()`) fail with `InvalidOperationError`.
- **Row order**: as in Polars, `groupBy` and `unique` return rows in no particular order; sort when order matters.

## Not supported yet

These fail with `InvalidOperationError`, naming the engine feature they need (see the open items in
[DESIGN.md](DESIGN.md)): `sqrt`, `pow` with a non-integer exponent, `std`, `median`, `quantile`, `first`, `last`,
regular-expression patterns in `str.contains` / `str.replace` / `str.replaceAll` (literal patterns work), `nUnique()`
over a window, `unique(keep=…)` other than `'any'`, and `maintainOrder`.
