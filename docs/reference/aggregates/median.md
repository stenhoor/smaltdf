# `median`

The median of the non-null values; null when there are none.

```railroad
median
```

## Signature

```typescript
expr.median(): Expr
```

## Returns

A `real`: the middle value, or the mean of the two middle values for an even count. Null for a group with no values.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column isn't a number. |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').median());
```

| shop | amt |
| --- | --- |
| a | 20 |
| b | 5 |
| c | null |

Over every row:

```ts
sales.select(col('amt').median());
```

| amt |
| --- |
| 10 |

## Demo

The typical value, unmoved by an outlier:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ ms: [12, 14, 13, 900] }).select(col('ms').median().alias('median'), col('ms').mean().alias('mean'));
```

| median | mean |
| --- | --- |
| 13.5 | 234.75 |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`max`](./max), [`count`](./count), [`groupBy`](../frames/groupBy)
