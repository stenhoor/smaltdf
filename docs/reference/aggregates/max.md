# `max`

The largest non-null value; null when there are none.

```railroad
max
```

## Signature

```typescript
expr.max(): Expr
```

## Returns

Of the column's type, or null for a group with no values.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column's values don't order: a list or struct. |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Notes

- Values compare as `sort` orders them. NaN is larger than every number.

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').max());
```

| shop | amt |
| --- | --- |
| a | 30 |
| b | 5 |
| c | null |

Over every row:

```ts
sales.select(col('amt').max());
```

| amt |
| --- |
| 30 |

## Demo

The best score per team:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ team: ['x', 'x', 'y'], score: [7, 9, 4] }).groupBy('team', { maintainOrder: true }).agg(col('score').max());
```

| team | score |
| --- | --- |
| x | 9 |
| y | 4 |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`count`](./count), [`len`](./len), [`groupBy`](../frames/groupBy)
