# `over`

An aggregate or window function computed per partition, on every row.

```railroad
over
```

## Signature

```typescript
expr.over(partitionBy?: string | Expr | (string | Expr)[], options?: { orderBy?: string | Expr | (string | Expr)[]; descending?: boolean | boolean[] }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `partitionBy` | `string \\| Expr \\| (string \\| Expr)[]` | The columns or expressions whose equal values make a partition. None (`[]`): one partition of all rows. |
| `orderBy` | `string \\| Expr \\| (string \\| Expr)[]` | The order within each partition, for running values, `shift`, `first` and `last`. |
| `descending` | `boolean \\| boolean[]` | Order `orderBy` largest first; one for all keys or one per key. |

## Returns

The function's value for each row, of the function's type, named as it is.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A partition or order key names a column the frame doesn't have. |
| `SMALTDF_TYPE` | The expression isn't one aggregate or window function, or [`rank`](./rank) gets an `orderBy`. |

## Notes

- An aggregate with `over` is the aggregate of the whole partition, the same on each of its rows (`sum` of no values is 0).
- The frame keeps its order: rows are numbered before a window that orders, and put back in place after.

## Examples

Each sale with its shop's total and its share:

```ts
const sales = frame({ shop: ['a', 'b', 'a', 'a', 'b'], t: [1, 1, 2, 3, 2], amt: [10, 4, null, 7, 6] });
sales.withColumns(col('amt').sum().over('shop').alias('shop_total'), col('amt').div(col('amt').sum().over('shop')).round(2).alias('share'));
```

| shop | t | amt | shop_total | share |
| --- | --- | --- | --- | --- |
| a | 1 | 10 | 17 | 0.59 |
| b | 1 | 4 | 10 | 0.4 |
| a | 2 | null | 17 | null |
| a | 3 | 7 | 17 | 0.41 |
| b | 2 | 6 | 10 | 0.6 |

A running total per shop, in time order:

```ts
sales.withColumns(col('amt').cumSum().over('shop', { orderBy: 't' }).alias('running'));
```

| shop | t | amt | running |
| --- | --- | --- | --- |
| a | 1 | 10 | 10 |
| b | 1 | 4 | 4 |
| a | 2 | null | null |
| a | 3 | 7 | 17 |
| b | 2 | 6 | 10 |

The top sale per shop:

```ts
sales.filter(col('amt').rank({ method: 'ordinal', descending: true }).over('shop').eq(1));
```

| shop | t | amt |
| --- | --- | --- |
| a | 1 | 10 |
| b | 2 | 6 |

## Demo

Each score against its class average:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const marks = frame({ cls: ['x', 'x', 'y', 'y'], score: [60, 80, 70, 90] });
marks.withColumns(col('score').sub(col('score').mean().over('cls')).alias('vs_avg'));
```

| cls | score | vs_avg |
| --- | --- | --- |
| x | 60 | -10 |
| x | 80 | 10 |
| y | 70 | -10 |
| y | 90 | 10 |

## See also

[`Aggregates`](../aggregates/), [`cumSum`](./cumSum), [`rank`](./rank), [`Windows`](../../guide/windows)
