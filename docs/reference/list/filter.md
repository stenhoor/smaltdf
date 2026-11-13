# `list.filter`

The elements for which a predicate is true, in order.

```railroad
list-filter
```

## Signature

```typescript
expr.list.filter(predicate: Expr): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `predicate` | `Expr` | A `bool` expression of [`element()`](./element), its [`position`](./position), and the row's columns. |

## Returns

A list of the same type; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list; the predicate isn't `bool`, or has an aggregate or a window. |

## Notes

- An element whose predicate is null is left out, as [`filter`](../frames/filter) leaves out a row.
- Unlike Polars' `list.filter`, the predicate may read the row's columns with `col`.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.filter(element().gt(1)).alias('over_1'));
```

| scores | over_1 |
| --- | --- |
| [3,1,2] | [3,2] |
| [] | [] |
| null | null |
| [5,null,5] | [5,5] |

## Demo

Readings above each sensor's threshold:

```ts
import { col, element, frame } from '@smaltworks/smaltdf';

frame({ threshold: [20, 30], readings: [[18, 25, 31], [29, 35]] }).select(col('readings').list.filter(element().gt(col('threshold'))).alias('alerts'));
```

| alerts |
| --- |
| [25,31] |
| [35] |

## See also

[`element`](./element), [`list.eval`](./eval), [`list.agg`](./agg), [`filter`](../frames/filter)
