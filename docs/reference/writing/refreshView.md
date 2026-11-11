# `refreshView`

Runs a materialized view again and keeps its new rows.

```railroad
refreshView
```

## Signature

```typescript
refreshView(db: Db, name: string): Promise<void>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `db` | `Db` | The database. |
| `name` | `string` | A materialized view. |

## Returns

A promise that resolves when the view holds its new rows.

## Errors

| Code | When |
| --- | --- |
| `SMALT_ERROR` | No materialized view has that name. |

## Examples

A materialized view keeps its rows until it is refreshed:

```ts
await frame({ n: [1, 2] }).createTable(db, 'nums');
await table('nums').select(col('n').sum()).createView(db, 'total', { materialized: true });
await frame({ n: [10] }).insertInto(db, 'nums');
table('total');
```

| n |
| --- |
| 3 |

Refreshed:

```ts
await refreshView(db, 'total');
table('total');
```

| n |
| --- |
| 13 |

## Demo

A cached summary, refreshed:

```ts
import { col, frame, refreshView, table } from '@smaltworks/smaltdf';

await frame({ v: [1, 2, 3] }).createTable(db, 'raw');
await table('raw').select(col('v').max()).createView(db, 'top', { materialized: true });
await frame({ v: [9] }).insertInto(db, 'raw');
await refreshView(db, 'top');
table('top');
```

| v |
| --- |
| 9 |

## See also

[`createView`](./createView)
