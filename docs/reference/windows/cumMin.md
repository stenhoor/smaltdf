# `cumMin`

The smallest non-null value so far.

```railroad
cumMin
```

## Signature

```typescript
expr.cumMin(): Expr
```

## Returns

Of the column's type.

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
sales.select('t', 'amt', col('amt').cumMin().alias('cumMin'));
```

| t | amt | cumMin |
| --- | --- | --- |
| 1 | 10 | 10 |
| 1 | 4 | 4 |
| 2 | null | null |
| 3 | 7 | 4 |
| 2 | 6 | 4 |

Per shop, in time order:

```ts
sales.withColumns(col('amt').cumMin().over('shop', { orderBy: 't' }).alias('cumMin')).sort(['shop', 't']);
```

| shop | t | amt | cumMin |
| --- | --- | --- | --- |
| a | 1 | 10 | 10 |
| a | 2 | null | null |
| a | 3 | 7 | 7 |
| b | 1 | 4 | 4 |
| b | 2 | 6 | 4 |

## Demo

The lowest price so far:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ day: [1, 2, 3, 4], price: [10, 8, 9, 7] }).withColumns(col('price').cumMin().alias('low'));
```

| day | price | low |
| --- | --- | --- |
| 1 | 10 | 10 |
| 2 | 8 | 8 |
| 3 | 9 | 8 |
| 4 | 7 | 7 |

## See also

[`over`](./over), [`cumSum`](./cumSum), [`cumMax`](./cumMax), [`cumCount`](./cumCount), [`shift`](./shift)
