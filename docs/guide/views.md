# Views

A view stores a frame by name. `table(name)` reads it as it reads a table, and its rows follow the tables it reads. A
materialized view keeps its rows until it is refreshed.

```ts
import { col, frame, refreshView, table } from '@smaltworks/smaltdf';

await frame({ id: [1, 2, 3], region: ['n', 's', 'n'], qty: [3, 12, 7] }).createTable(db, 'orders');
await table('orders').filter(col('qty').gt(5)).createView(db, 'big');
table('big');
```

| id | region | qty |
| --- | --- | --- |
| 2 | s | 12 |
| 3 | n | 7 |

A view joins, groups and filters like a table:

```ts
table('big').groupBy('region', { maintainOrder: true }).agg(col('qty').sum());
```

| region | qty |
| --- | --- |
| s | 12 |
| n | 7 |

## Materialized views

With `materialized: true` the view keeps its rows, so reading it doesn't run its frame again.
[`refreshView`](../reference/writing/refreshView) runs it again.

```ts
await table('orders').select(col('qty').sum().alias('total')).createView(db, 'total', { materialized: true });
await frame({ id: [4], region: ['e'], qty: [20] }).insertInto(db, 'orders');
table('total');
```

| total |
| --- |
| 22 |

```ts
await refreshView(db, 'total');
table('total');
```

| total |
| --- |
| 42 |

## smaltdf registered where the engine runs

A view is stored as smaltdf's own frame, with its columns. The engine binds it when a plan reads it, through
[`dfLanguage`](../reference/writing/dfLanguage), so smaltdf must be registered where the engine runs:
`registerLanguage(dfLanguage)` in process, or `defineWorker({ languages: [dfLanguage] })` in a worker entry
([Installation](./getting-started)).

- A view reads tables and views, not data from JavaScript: write data to a table first.
- A pivot in a view keeps the columns it had when the view was made.
- Views of other languages, such as smaltql's, read as tables when they give their column names; their columns are
  then of type `any`.
