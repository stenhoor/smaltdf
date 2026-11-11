# `sum`

The sum of the non-null values; 0 when there are none.

```railroad
sum
```

## Signature

```typescript
expr.sum(): Expr
```

## Returns

Of the column's type: `int` or `real` (or `duration`). 0 for a group with no values, of that type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column isn't a number or a duration. |
| `SMALT_ERROR` | An integer sum overflows 64 bits. |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Notes

- An integer sum that overflows is an error, as integer arithmetic is.

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').sum());
```

| shop | amt |
| --- | --- |
| a | 40 |
| b | 5 |
| c | 0 |

Over every row:

```ts
sales.select(col('amt').sum());
```

| amt |
| --- |
| 45 |

## Demo

Totals per day:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ day: ['mon', 'mon', 'tue'], km: [3.5, 2, 7] }).groupBy('day', { maintainOrder: true }).agg(col('km').sum());
```

| day | km |
| --- | --- |
| mon | 5.5 |
| tue | 7 |

## See also

[`mean`](./mean), [`min`](./min), [`max`](./max), [`count`](./count), [`len`](./len), [`groupBy`](../frames/groupBy)
