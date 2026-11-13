# Compared with Polars

Polars inspired smaltdf's functions, and many give the same results. The comparison tests ([`compare/`](../../compare/cases.ts), run in their
own CI job) run each case both ways over the same tables, and fail when a result changes, so the table below stays
true. Order is compared too, except where neither side promises one (`groupBy` and joins without `maintainOrder`).

<!-- compare:begin (written by compare/compare.test.ts: npm run compare with UPDATE=1) -->

With Polars 2.1.0, 88 of the 100 cases give the same columns, types and rows (or both an
error). They cover `filter`, `select`, `withColumns`, `sort`, `head`, `tail`, `slice`, `div`, `floorDiv`, `mod`, `add`, `eq`, `and`, `isNull`, `cast`, `round`, `str.lower`, `str.contains`, `groupBy`, `median`, `sum`, `unique`, `join`, `joinAsof`, `concat`, `over`, `cumSum`, `shift`, `rank`, `pivot`, `unpivot`, `dt.year`, `dt.hour`, `dt.date`, `dt.truncate`, `dt.offsetBy`, `dt.strftime`, `sub`, `gt`, `str.toDatetime`, `str.toDate`, `dt.toZone`, `dt.fromZone`, `list.len`, `list.contains`, `list.sort`, `list.unique`, `list.sum`, `list.join`, `list.slice`, `list.concat`, `list.get`, `list.median`, `list.nUnique`, `list.all`, `list.shift`, `list.gather`, `list.item`, `list.setUnion`, `list.eval`, `list.filter`, `list.agg`, `explode`, `implode`, `struct.field`, `unnest`.

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
| `list.get` | Out of range, `list.get` gives null; Polars fails unless `null_on_oob=True` (`nullOnOob: false` fails as Polars does). |
| `list.sample` | The same number of elements, chosen by another random generator: a seed repeats smaltdf's choice, not Polars'. |
| `list.setDifference` | The same elements, in first-appearance order (`[1, 2]` from `[3, 1, 2]`); Polars 2.1 can give them in another order (`[2, 1]`). |
| `element` | A body may read the row's columns (`col`); Polars refuses named columns in `eval`. |

<!-- compare:end -->
