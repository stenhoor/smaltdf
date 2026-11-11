# `std`

The sample standard deviation of the non-null values.

```railroad
std
```

## Signature

```typescript
expr.std(): Expr
```

## Returns

A `real`: the square root of [`var`](./var). Null with fewer than two values.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column isn't a number. |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').std());
```

| shop | amt |
| --- | --- |
| a | 14.142135623730951 |
| b | null |
| c | null |

Over every row:

```ts
sales.select(col('amt').std());
```

| amt |
| --- |
| 13.228756555322953 |

## Demo

Spread of measurements:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ g: [2, 4, 4, 4, 5, 5, 7, 9] }).select(col('g').std().round(4));
```

| g |
| --- |
| 2.1381 |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`max`](./max), [`count`](./count), [`groupBy`](../frames/groupBy)
