# `last`

The value of the last row, in the group's order.

```railroad
last
```

## Signature

```typescript
expr.last(): Expr
```

## Returns

Of the column's type: the last row's value, null or not.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Notes

- The group's order is the frame's, or `orderBy`'s with [`over`](../windows/over).

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').last());
```

| shop | amt |
| --- | --- |
| a | 30 |
| b | null |
| c | null |

Over every row:

```ts
sales.select(col('amt').last());
```

| amt |
| --- |
| null |

## Demo

The latest status of each order:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ order: [1, 1, 2, 1], status: ['new', 'paid', 'new', 'sent'] }).groupBy('order', { maintainOrder: true }).agg(col('status').last());
```

| order | status |
| --- | --- |
| 1 | sent |
| 2 | new |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`max`](./max), [`count`](./count), [`groupBy`](../frames/groupBy)
