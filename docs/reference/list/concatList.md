# `concatList`

One list of values and lists, in order.

```railroad
concatList
```

## Signature

```typescript
concatList(...values: ExprLike[]): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `values` | `ExprLike[]` | Lists, whose elements are each added, and single values, each added as one element; of one element type. |

## Returns

A `list<T>`; null if any of the lists is null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | No value is given, or the values and lists are of different element types. |

## Examples

```ts
const scores = frame({ best: [9, 7], rest: [[3, 5], []] });
scores.select(concatList(col('best'), col('rest'), 0).alias('all'));
```

| all |
| --- |
| [9,3,5,0] |
| [7,0] |

## Demo

First and last stops around a route's middle ones:

```ts
import { col, concatList, frame } from '@smaltworks/smaltdf';

frame({ from: ['A'], via: [['B', 'C']], to: ['D'] }).select(concatList(col('from'), col('via'), col('to')).alias('route'));
```

| route |
| --- |
| ["A","B","C","D"] |

## See also

[`list.concat`](./concat), [`struct`](./struct), [`implode`](../aggregates/implode)
