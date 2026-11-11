# `mean`

The mean of the non-null values; null when there are none.

```railroad
mean
```

## Signature

```typescript
expr.mean(): Expr
```

## Returns

A `real`, or null for a group with no values.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column isn't a number. |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').mean());
```

| shop | amt |
| --- | --- |
| a | 20 |
| b | 5 |
| c | null |

Over every row:

```ts
sales.select(col('amt').mean());
```

| amt |
| --- |
| 15 |

## Demo

Average rating per film:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ film: ['x', 'x', 'y'], stars: [4, 5, 3] }).groupBy('film', { maintainOrder: true }).agg(col('stars').mean());
```

| film | stars |
| --- | --- |
| x | 4.5 |
| y | 3 |

## See also

[`sum`](./sum), [`min`](./min), [`max`](./max), [`count`](./count), [`len`](./len), [`groupBy`](../frames/groupBy)
