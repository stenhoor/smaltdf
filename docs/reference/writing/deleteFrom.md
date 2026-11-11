# `deleteFrom`

Deletes the rows of a table a condition is true for.

```railroad
deleteFrom
```

## Signature

```typescript
deleteFrom(table: string, options?: { where?: Expr }): Write
write.run(db: Db): Promise<{ rows: number }>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `table` | `string` | The table. |
| `where` | `Expr` | Which rows. Default: all of them. |

## Returns

A `Write`: `run(db)` runs it and resolves to `{ rows }`, the number of rows deleted; `plan(db)` gives its plan.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | The table, or a column of `where`, doesn't exist. |

## Examples

Empty rows removed:

```ts
await frame({ id: [1, 2, 3], qty: [5, 0, 2] }).createTable(db, 'lines');
await deleteFrom('lines', { where: col('qty').eq(0) }).run(db);
```

| rows |
| --- |
| 1 |

Read back:

```ts
table('lines');
```

| id | qty |
| --- | --- |
| 1 | 5 |
| 3 | 2 |

## Demo

Old entries removed:

```ts
import { col, deleteFrom, frame, table } from '@smaltworks/smaltdf';

await frame({ year: [2023, 2024, 2025] }).createTable(db, 'archive');
await deleteFrom('archive', { where: col('year').lt(2025) }).run(db);
table('archive');
```

| year |
| --- |
| 2025 |

## See also

[`update`](./update), [`filter`](../frames/filter)
