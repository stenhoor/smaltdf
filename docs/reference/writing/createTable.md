# `createTable`

Makes a table with the frame's columns and types, and writes its rows into it.

```railroad
createTable
```

## Signature

```typescript
frame.createTable(db: Db, name: string, options?: { storage?: 'row' | 'columnar'; ifNotExists?: boolean }): Promise<{ rows: number }>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `db` | `Db` | The database. |
| `name` | `string` | The new table's name. |
| `storage` | `'row' \\| 'columnar'` | How the table stores its rows. Default `row`. |
| `ifNotExists` | `boolean` | Leave an existing table as it is and write nothing. Default `false`: an existing table is an error. |

## Returns

A promise of `{ rows }`: the number of rows written. The columns' storage types follow their types:

| Type | Stored as |
| --- | --- |
| `int` | `INTEGER` |
| `bool` | `BOOLEAN` |
| `real` | `REAL` |
| `text` | `TEXT` |
| `blob` | `BLOB` |
| `date`, `datetime`, `time`, `duration` | `DATE`, `DATETIME`, `TIME`, `DURATION` |
| `list<…>`, `struct<…>` | `LIST`, `STRUCT`, with their type |
| `null`, `any` | `ANY` |

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A name the frame reads isn't in the database. |
| `SMALT_ERROR` | A table of that name exists (without `ifNotExists`). |

## Notes

- The table and its rows come in one transaction: if the rows fail, there is no table.

## Examples

A table from data, read back:

```ts
await frame({ sku: ['a1', 'b2'], stock: [4, 0] }).createTable(db, 'stock');
table('stock');
```

| sku | stock |
| --- | --- |
| a1 | 4 |
| b2 | 0 |

A table from a query, stored by column:

```ts
await table('stock').filter(col('stock').gt(0)).createTable(db, 'in_stock', { storage: 'columnar' });
```

| rows |
| --- |
| 1 |

A table that exists:

<!-- docs:error SMALT_ERROR -->
```ts
await frame({ sku: ['c3'] }).createTable(db, 'stock');
```

## Demo

A summary table:

```ts
import { col, frame, table } from '@smaltworks/smaltdf';

await frame({ cat: ['a', 'b', 'a'], n: [1, 2, 3] }).createTable(db, 'facts');
await table('facts').groupBy('cat', { maintainOrder: true }).agg(col('n').sum()).createTable(db, 'totals');
table('totals');
```

| cat | n |
| --- | --- |
| a | 4 |
| b | 2 |

## See also

[`insertInto`](./insertInto), [`createView`](./createView), [`table`](../frames/table)
