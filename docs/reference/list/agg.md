# `list.agg`

An expression of aggregates over each list's elements.

```railroad
list-agg
```

## Signature

```typescript
expr.list.agg(expr: Expr): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `expr` | `Expr` | The body: [aggregates](../aggregates/) of [`element()`](./element) (`element().sum()`, [`len()`](../aggregates/len)), and expressions of them and of the row's columns. |

## Returns

The body's type: one value per list. A null list gives null; an empty list gives the aggregates of no values (`sum` 0, `len` 0, the others null).

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list; `element()` is outside an aggregate; an aggregate holds another, or the body has a window. |

## Notes

- Any aggregate works: `median`, `std`, `first`, `implode`, and the rest.
- The aggregates run in one pass over each list, as an aggregation runs over a group's rows.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.agg(element().sum()).alias('sum'), col('scores').list.agg(element().max().sub(element().min())).alias('range'), col('scores').list.agg(len()).alias('n'));
```

| scores | sum | range | n |
| --- | --- | --- | --- |
| [3,1,2] | 6 | 2 | 3 |
| [] | 0 | null | 0 |
| null | null | null | null |
| [5,null,5] | 10 | 0 | 3 |

## Demo

The share of each order's items that shipped:

```ts
import { col, element, frame, len } from '@smaltworks/smaltdf';

frame({ shipped: [[true, false, true, true], [false]] }).select(col('shipped').list.agg(element().cast('int').sum().div(len())).alias('share'));
```

| share |
| --- |
| 0.75 |
| 0 |

## See also

[`element`](./element), [`list.eval`](./eval), [`list.filter`](./filter), [`groupBy`](../frames/groupBy)
