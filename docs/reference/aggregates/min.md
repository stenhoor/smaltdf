# `min`

The smallest non-null value; null when there are none.

```railroad
min
```

## Signature

```typescript
expr.min(): Expr
```

## Returns

Of the column's type, or null for a group with no values.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column's values don't order: a list or struct. |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Notes

- Values compare as `sort` orders them: numbers as numbers, text by code point, dates and times in time.

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').min());
```

| shop | amt |
| --- | --- |
| a | 10 |
| b | 5 |
| c | null |

Over every row:

```ts
sales.select(col('amt').min());
```

| amt |
| --- |
| 5 |

## Demo

The earliest date per project:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ project: ['p', 'p', 'q'], due: ['2026-03-01', '2026-01-15', '2026-02-02'] }).groupBy('project', { maintainOrder: true }).agg(col('due').cast('date').min());
```

| project | due |
| --- | --- |
| p | 2026-01-15 |
| q | 2026-02-02 |

## See also

[`sum`](./sum), [`mean`](./mean), [`max`](./max), [`count`](./count), [`len`](./len), [`groupBy`](../frames/groupBy)
