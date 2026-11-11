# `withColumns`

The frame's columns, with these added at the end or replacing a column of the same name in place.

```railroad
withColumns
```

## Signature

```typescript
frame.withColumns(...columns: (Expr | string)[]): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `columns` | `(Expr \| string)[]` | The columns to add or replace, named as `select` names them. |

## Returns

A frame with every column it had, a new one at the end for each new name, and each replaced column in its place. Rows and order are the frame's.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | An expression names a column the frame doesn't have, or two of the new columns get one name. |
| `SMALTDF_TYPE` | An expression has the wrong type for its method, or is an aggregate without `over`. |

## Notes

- The expressions all read the frame as it was: one doesn't see another's new column. Chain another `withColumns` for that.

## Examples

A new column, and one replaced:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.withColumns(col('qty').mul(col('price')).alias('total'), col('price').mul(2));
```

| id | region | qty | price | total |
| --- | --- | --- | --- | --- |
| 1 | n | 3 | 5 | 7.5 |
| 2 | s | 12 | 2 | 12 |
| 3 | n | 7 | 8 | 28 |
| 4 | e | null | 6 | null |
| 5 | s | 5 | 4 | 10 |

A window keeps every row:

```ts
orders.withColumns(col('qty').sum().over('region').alias('region_qty'));
```

| id | region | qty | price | region_qty |
| --- | --- | --- | --- | --- |
| 1 | n | 3 | 2.5 | 10 |
| 2 | s | 12 | 1 | 17 |
| 3 | n | 7 | 4 | 10 |
| 4 | e | null | 3 | 0 |
| 5 | s | 5 | 2 | 17 |

## Demo

Adding a derived column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const trips = frame({ km: [12, 40, 7], minutes: [15, 30, 20] });
trips.withColumns(col('km').div(col('minutes')).mul(60).round(1).alias('kmh'));
```

| km | minutes | kmh |
| --- | --- | --- |
| 12 | 15 | 48 |
| 40 | 30 | 80 |
| 7 | 20 | 21 |

## See also

[`select`](../frames/select), [`alias`](../expressions/alias), [`over`](../windows/over)
