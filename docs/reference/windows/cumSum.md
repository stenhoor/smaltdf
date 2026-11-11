# `cumSum`

The running sum of the non-null values so far.

```railroad
cumSum
```

## Signature

```typescript
expr.cumSum(): Expr
```

## Returns

Of the column's type: `int` or `real`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column's type doesn't fit, or it is used in `agg`. |

## Notes

- A null value gives null on its own row and doesn't change the running value.

## Examples

Over all rows, in the frame's order:

```ts
const sales = frame({ shop: ['a', 'b', 'a', 'a', 'b'], t: [1, 1, 2, 3, 2], amt: [10, 4, null, 7, 6] });
sales.select('t', 'amt', col('amt').cumSum().alias('cumSum'));
```

| t | amt | cumSum |
| --- | --- | --- |
| 1 | 10 | 10 |
| 1 | 4 | 14 |
| 2 | null | null |
| 3 | 7 | 21 |
| 2 | 6 | 27 |

Per shop, in time order:

```ts
sales.withColumns(col('amt').cumSum().over('shop', { orderBy: 't' }).alias('cumSum')).sort(['shop', 't']);
```

| shop | t | amt | cumSum |
| --- | --- | --- | --- |
| a | 1 | 10 | 10 |
| a | 2 | null | null |
| a | 3 | 7 | 17 |
| b | 1 | 4 | 4 |
| b | 2 | 6 | 10 |

## Demo

A balance from transactions:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ day: [1, 2, 3, 4], change: [100, -30, 45, -20] }).withColumns(col('change').cumSum().alias('balance'));
```

| day | change | balance |
| --- | --- | --- |
| 1 | 100 | 100 |
| 2 | -30 | 70 |
| 3 | 45 | 115 |
| 4 | -20 | 95 |

## See also

[`over`](./over), [`cumMin`](./cumMin), [`cumMax`](./cumMax), [`cumCount`](./cumCount), [`shift`](./shift)
