# `createView`

Stores the frame by name, as a view that reads as a table.

```railroad
createView
```

## Signature

```typescript
frame.createView(db: Db, name: string, options?: { materialized?: boolean; ifNotExists?: boolean }): Promise<void>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `db` | `Db` | The database. |
| `name` | `string` | The view's name. |
| `materialized` | `boolean` | Keep the rows, until [`refreshView`](./refreshView). Default `false`: the rows follow the tables it reads. |
| `ifNotExists` | `boolean` | Leave an existing view as it is. Default `false`. |

## Returns

A promise that resolves when the view is stored. `table(name)` then reads it.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A name the frame reads isn't in the database. |
| `SMALTDF_TYPE` | The frame reads data from JavaScript (`frame(…)`): a view reads tables and views. |
| `SMALT_ERROR` | smaltdf isn't registered where the engine runs, or the name is taken. |

## Notes

- A view is stored as smaltdf's own frame, with its columns: it is bound by [`dfLanguage`](./dfLanguage) wherever a plan reads it.
- A pivot in a view keeps the columns it had when the view was made.

## Examples

A view over a table:

```ts
await frame({ id: [1, 2, 3], qty: [3, 12, 7] }).createTable(db, 'orders');
await table('orders').filter(col('qty').gt(5)).createView(db, 'big');
table('big');
```

| id | qty |
| --- | --- |
| 2 | 12 |
| 3 | 7 |

It follows its table:

```ts
await frame({ id: [4], qty: [20] }).insertInto(db, 'orders');
table('big');
```

| id | qty |
| --- | --- |
| 2 | 12 |
| 3 | 7 |
| 4 | 20 |

## Demo

A view of totals:

```ts
import { col, frame, table } from '@smaltworks/smaltdf';

await frame({ who: ['ann', 'bo', 'ann'], eur: [5, 7, 3] }).createTable(db, 'pay');
await table('pay').groupBy('who', { maintainOrder: true }).agg(col('eur').sum()).createView(db, 'per_person');
table('per_person');
```

| who | eur |
| --- | --- |
| ann | 8 |
| bo | 7 |

## See also

[`refreshView`](./refreshView), [`dfLanguage`](./dfLanguage), [`Views`](../../guide/views)
