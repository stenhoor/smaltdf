# Frames

A frame describes rows with named, typed columns. It comes from a source (`table`, `frame`, `concat`), and each
method gives a new frame: building one runs nothing. `collect(db)` runs it in the engine and gives its rows;
`plan(db)` gives the plan it runs as.

```ts
import { col, table } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Sources

- [`table`](./table): The rows of a table or view in the database, in storage order.
- [`frame`](./frame): Rows from JavaScript data: one column per key, each an array or a typed array.
- [`concat`](./concat): The frames' rows one after another: the first frame's, then the next one's.

### Columns

- [`select`](./select): One column per expression, in that order.
- [`withColumns`](./withColumns): The frame's columns, with these added at the end or replacing a column of the same name in place.

### Rows

- [`filter`](./filter): The rows where every predicate is true.
- [`sort`](./sort): Rows ordered by one or more expressions. Stable: equal rows keep their order.
- [`head`](./head): The first `n` rows.
- [`tail`](./tail): The last `n` rows.
- [`slice`](./slice): `n` rows from position `offset`, or all of them from there.
- [`unique`](./unique): One row per distinct value of some columns: the first or the last of each.
- [`sample`](./sample): Rows drawn at random: `n` of them, or a fraction.

### Aggregation

- [`groupBy`](./groupBy): One row per distinct key, with aggregates of each group's rows: `groupBy(…).agg(…)`.

### Joins

- [`join`](./join): Rows of two frames matched on equal keys.
- [`joinAsof`](./joinAsof): Each left row with the right row whose key is nearest its own.

### Reshaping

- [`pivot`](./pivot): One row per `index` value and one column per value of `on`, each cell an aggregate of `values`.
- [`unpivot`](./unpivot): Columns to rows: for each row, one row per column of `on`, with its name and its value.
- [`explode`](./explode): One row per element of a list column, the other columns repeated.
- [`unnest`](./unnest): A struct column replaced by one column per field.

### Running

- [`collect`](./collect): Runs the frame in the engine and gives its columns, types and rows.
- [`plan`](./plan): The plan statement the frame runs as, without running it.

## Rules they share

- **Nothing runs until `collect`.** A method checks only its own arguments; names and types are checked when the plan
  is built (`plan` or `collect`), against the database's catalog, before anything runs.
- **A string is a column.** Where a method takes columns (`select('id')`, `sort('qty')`), a string names one; where it
  takes a value (`col('qty').gt(5)`), a string is text.
- **Order.** `filter`, `select`, `withColumns`, `sort` (stable), `head`, `tail`, `slice`, `explode`, `unnest`,
  `unpivot` and `concat` keep the frame's order. `groupBy`, `unique`, `join` and `pivot` give rows in no particular order
  unless asked (`maintainOrder: true`).
- **Errors name the method:** `filter: no column "qtty" in orders (columns: id, qty, price)`. See
  [Errors](../../guide/errors).
