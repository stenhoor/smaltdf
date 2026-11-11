# `cumCount`

The number of non-null values so far.

```railroad
cumCount
```

## Signature

```typescript
expr.cumCount(): Expr
```

## Returns

An `int`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column's type doesn't fit, or it is used in `agg`. |

## Notes

- A null value gives null on its own row and doesn't change the running value.

## Examples

Over all rows, in the frame's order:

```ts
const sales = frame({ shop: ['a', 'b', 'a', 'a', 'b'], t: [1, 1, 2, 3, 2], amt: [10, 4, null, 7, 6] });
sales.select('t', 'amt', col('amt').cumCount().alias('cumCount'));
```

| t | amt | cumCount |
| --- | --- | --- |
| 1 | 10 | 1 |
| 1 | 4 | 2 |
| 2 | null | 2 |
| 3 | 7 | 3 |
| 2 | 6 | 4 |

Per shop, in time order:

```ts
sales.withColumns(col('amt').cumCount().over('shop', { orderBy: 't' }).alias('cumCount')).sort(['shop', 't']);
```

| shop | t | amt | cumCount |
| --- | --- | --- | --- |
| a | 1 | 10 | 1 |
| a | 2 | null | 1 |
| a | 3 | 7 | 2 |
| b | 1 | 4 | 1 |
| b | 2 | 6 | 2 |

## Demo

Answers so far:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ q: [1, 2, 3, 4], answer: ['a', null, 'c', 'd'] }).withColumns(col('answer').cumCount().alias('answered'));
```

| q | answer | answered |
| --- | --- | --- |
| 1 | a | 1 |
| 2 | null | 1 |
| 3 | c | 2 |
| 4 | d | 3 |

## See also

[`over`](./over), [`cumSum`](./cumSum), [`cumMin`](./cumMin), [`cumMax`](./cumMax), [`shift`](./shift)
