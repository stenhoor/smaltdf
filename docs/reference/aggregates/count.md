# `count`

The number of non-null values.

```railroad
count
```

## Signature

```typescript
expr.count(): Expr
```

## Returns

An `int`: 0 for a group with no values.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Notes

- [`len()`](./len) counts rows, nulls included.

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').count());
```

| shop | amt |
| --- | --- |
| a | 2 |
| b | 1 |
| c | 0 |

Over every row:

```ts
sales.select(col('amt').count());
```

| amt |
| --- |
| 3 |

## Demo

Answers given:

```ts
import { col, frame, len } from '@smaltworks/smaltdf';

frame({ answer: ['yes', null, 'no', null] }).select(col('answer').count().alias('answered'), len().alias('asked'));
```

| answered | asked |
| --- | --- |
| 2 | 4 |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`max`](./max), [`len`](./len), [`groupBy`](../frames/groupBy)
