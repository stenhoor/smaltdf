# `table`

The rows of a table or view in the database, in storage order.

```railroad
table
```

## Signature

```typescript
table(name: string): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | The table or view, as the database names it. |

## Returns

A frame with the table's columns and their types, read from the database's catalog when the plan is built.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | No table or view has that name. |

## Notes

- A row table gives its rows in rowid order. A columnar table gives them in the order it stores them, which isn't
  always the order they were written: [`sort`](./sort) for an order to rely on.
- A view stored by smaltdf, or by another language that gives its column names, reads as a table does ([`createView`](../writing/createView)).

## Examples

A table made from a frame, then read back:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
await orders.createTable(db, 'orders');
table('orders').filter(col('qty').gt(4));
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 2 | s | 12 | 1 |
| 3 | n | 7 | 4 |
| 5 | s | 5 | 2 |

A name the database doesn't have fails when the frame runs:

<!-- docs:error SMALTDF_SCHEMA -->
```ts
table('order').head(1);
```

## Demo

A table, written and read:

```ts
import { col, frame, table } from '@smaltworks/smaltdf';

await frame({ sku: ['a1', 'b2', 'c3'], stock: [4, 0, 9] }).createTable(db, 'stock');
table('stock').filter(col('stock').gt(0)).sort('stock', { descending: true });
```

| sku | stock |
| --- | --- |
| c3 | 9 |
| a1 | 4 |

## See also

[`frame`](../frames/frame), [`createTable`](../writing/createTable), [`createView`](../writing/createView), [`collect`](../frames/collect)
