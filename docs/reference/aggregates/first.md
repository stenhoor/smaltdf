# `first`

The value of the first row, in the group's order.

```railroad
first
```

## Signature

```typescript
expr.first(): Expr
```

## Returns

Of the column's type: the first row's value, null or not.

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
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').first());
```

| shop | amt |
| --- | --- |
| a | 10 |
| b | 5 |
| c | null |

Over every row:

```ts
sales.select(col('amt').first());
```

| amt |
| --- |
| 10 |

## Demo

The first entry of each user:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ user: ['u1', 'u2', 'u1'], page: ['home', 'cart', 'shop'] }).groupBy('user', { maintainOrder: true }).agg(col('page').first());
```

| user | page |
| --- | --- |
| u1 | home |
| u2 | cart |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`max`](./max), [`count`](./count), [`groupBy`](../frames/groupBy)
