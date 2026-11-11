# `groupBy`

One row per distinct key, with aggregates of each group's rows: `groupBy(…).agg(…)`.

```railroad
groupBy
```

## Signature

```typescript
frame.groupBy(...keys: (Expr | string)[], options?: { maintainOrder?: boolean }): GroupBy
groupBy.agg(...aggregates: (Expr | string)[]): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `keys` | `(Expr \\| string)[]` | The columns or expressions whose distinct values make the groups. |
| `maintainOrder` | `boolean` | Give the groups in order of each group's first row. Default `false`: no particular order. |
| `aggregates` | `(Expr \\| string)[]` | The columns of `agg`: [aggregates](../aggregates/), and expressions of aggregates and keys. |

## Returns

A frame with the keys first, then one column per aggregate, and one row per group.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A key or aggregate names a column the frame doesn't have, or an `agg` column reads a column outside an aggregate that isn't a key. |
| `SMALTDF_TYPE` | An aggregate doesn't take its column's type, or an `agg` column uses a window function. |

## Notes

- Null keys make a group of their own.
- An expression in `agg` combines aggregates and keys: `col('qty').sum().div(len())`, `col('region').str.upper()`.
- `sum` of a group with no values is 0; `mean`, `min` and `max` are null.

## Examples

Totals per region, in order of first appearance:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.groupBy('region', { maintainOrder: true }).agg(col('qty').sum(), len().alias('orders'));
```

| region | qty | orders |
| --- | --- | --- |
| n | 10 | 2 |
| s | 17 | 2 |
| e | 0 | 1 |

A key that is an expression:

```ts
orders.groupBy(col('price').ge(3).alias('dear'), { maintainOrder: true }).agg(col('id').implode());
```

| dear | id |
| --- | --- |
| false | [1,2,5] |
| true | [3,4] |

Outside an aggregate, `agg` sees only the keys: a group has many values of any other column.

<!-- docs:error SMALTDF_SCHEMA -->
```ts
orders.groupBy('region').agg(col('qty'));
```

## Demo

A summary per category:

```ts
import { col, frame, len } from '@smaltworks/smaltdf';

const spend = frame({ cat: ['food', 'rent', 'food', 'fun', 'food'], eur: [12, 800, 30, 25, 8] });
spend.groupBy('cat', { maintainOrder: true }).agg(len().alias('n'), col('eur').sum().alias('total'), col('eur').mean().round(1).alias('avg'));
```

| cat | n | total | avg |
| --- | --- | --- | --- |
| food | 3 | 50 | 16.7 |
| rent | 1 | 800 | 800 |
| fun | 1 | 25 | 25 |

## See also

[`Aggregates`](../aggregates/), [`unique`](../frames/unique), [`over`](../windows/over), [`Aggregation`](../../guide/aggregation)
