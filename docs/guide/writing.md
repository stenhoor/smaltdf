# Writing

Frames write to tables: make a table from a frame, add a frame's rows to one, and change or delete rows. Each write runs
at once, in one transaction, and resolves to `{ rows }`: how many it wrote, changed or deleted.

## A table from a frame

[`createTable`](../reference/writing/createTable) makes a table with the frame's columns and types and writes its rows,
in one step: if the rows fail, there is no table.

```ts
import { col, deleteFrom, frame, table, update } from '@smaltworks/smaltdf';

await frame({ sku: ['a1', 'b2', 'c3'], name: ['cup', 'mug', 'jar'], stock: [4, 0, 9] }).createTable(db, 'items');
table('items');
```

| sku | name | stock |
| --- | --- | --- |
| a1 | cup | 4 |
| b2 | mug | 0 |
| c3 | jar | 9 |

A frame over tables makes a table too: a summary, kept. `storage: 'columnar'` stores it by column, for scans over few
columns of many rows.

## Adding rows

[`insertInto`](../reference/writing/insertInto) writes a frame's rows into a table, by column name. The table's other
columns take their defaults.

```ts
await frame({ sku: ['d4'], name: ['bowl'], stock: [2] }).insertInto(db, 'items');
```

| rows |
| --- |
| 1 |

Each column must fit its table column: `int` into `INTEGER`, `REAL` or `NUMERIC`, `real` into `REAL` or `NUMERIC`,
`text` into `TEXT`, and so on. A table made from whole numbers has an `INTEGER` column, which a `real` doesn't fit:

<!-- docs:error SMALTDF_TYPE -->
```ts
await frame({ sku: ['e5'], name: ['tin'], stock: [1.5] }).insertInto(db, 'items');
```

`onConflict` says what a row that breaks a constraint does: undo the write (`abort`, the default), skip the row
(`ignore`), or replace the row it conflicts with (`replace`).

## Changing rows

[`update`](../reference/writing/update) sets columns in the rows a condition is true for; the expressions read the row
as it was. [`deleteFrom`](../reference/writing/deleteFrom) deletes them.

```ts
await update('items', { set: { stock: col('stock').add(10) }, where: col('stock').eq(0) }).run(db);
await deleteFrom('items', { where: col('sku').eq('d4') }).run(db);
table('items');
```

| sku | name | stock |
| --- | --- | --- |
| a1 | cup | 4 |
| b2 | mug | 10 |
| c3 | jar | 9 |

`update` and `deleteFrom` give a `Write`: `run(db)` runs it, and `plan(db)` gives the plan it runs as.
