# `select`

One column per expression, in that order.

```railroad
select
```

## Signature

```typescript
frame.select(...columns: (Expr | string)[]): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `columns` | `(Expr \| string)[]` | The new columns. A string is the column of that name. |

## Returns

A frame with one column per expression, named as the expression is (its column, or its `alias`), with the
frame's rows in its order. When every expression is an aggregate (or a literal), the frame is one row over all rows.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | An expression names a column the frame doesn't have, or two columns get one name. |
| `SMALTDF_TYPE` | An expression has the wrong type for its method, or mixes aggregates with plain columns. |

## Notes

- An expression is named after the first column it reads: `col('qty').mul(2)` is `qty`. Give another name with [`alias`](../expressions/alias).
- A window function ([`over`](../windows/over)) computes a value per row from the rows around it.

## Examples

Columns and expressions:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.select('id', col('qty').mul(col('price')).alias('total'));
```

| id | total |
| --- | --- |
| 1 | 7.5 |
| 2 | 12 |
| 3 | 28 |
| 4 | null |
| 5 | 10 |

All aggregates: one row over every row:

```ts
orders.select(col('qty').sum(), col('price').max().alias('top_price'));
```

| qty | top_price |
| --- | --- |
| 27 | 4 |

Two columns with one name are an error:

<!-- docs:error SMALTDF_SCHEMA -->
```ts
orders.select('qty', col('qty').mul(2));
```

## Demo

Picking and computing columns:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const items = frame({ name: ['tea', 'cake'], price: [4.5, 3.25], tax: [0.1, 0.2] });
items.select('name', col('price').mul(col('tax').add(1)).round(2).alias('gross'));
```

| name | gross |
| --- | --- |
| tea | 4.95 |
| cake | 3.9 |

## See also

[`withColumns`](../frames/withColumns), [`alias`](../expressions/alias), [`col`](../expressions/col), [`Columns, rows and order`](../../guide/columns-and-rows)
