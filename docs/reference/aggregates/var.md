# `var`

The sample variance of the non-null values.

```railroad
var
```

## Signature

```typescript
expr.var(): Expr
```

## Returns

A `real`: the sum of squared differences from the mean, divided by the count less one. Null with fewer than two values.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column isn't a number. |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').var());
```

| shop | amt |
| --- | --- |
| a | 200 |
| b | null |
| c | null |

Over every row:

```ts
sales.select(col('amt').var());
```

| amt |
| --- |
| 175 |

## Demo

Variance of measurements:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ g: [2, 4, 4, 4, 5, 5, 7, 9] }).select(col('g').var().round(4));
```

| g |
| --- |
| 4.5714 |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`max`](./max), [`count`](./count), [`groupBy`](../frames/groupBy)
