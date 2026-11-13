# `list.setSymmetricDifference`

The elements of one list but not both, each once.

```railroad
list-setSymmetricDifference
```

## Signature

```typescript
expr.list.setSymmetricDifference(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | A list of the same element type. |

## Returns

A list of the same type; null if either list is null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The values aren't two lists of one element type. |

## Notes

- This list's elements first, then the other's, each in order. Null is one value.

## Examples

Of each list:

```ts
const pairs = frame({ a: [[3, 1, 2], [], null, [5, null, 5]], b: [[3, 4, null], [1], [2], []] });
pairs.select('a', 'b', col('a').list.setSymmetricDifference(col('b')).alias('either'));
```

| a | b | either |
| --- | --- | --- |
| [3,1,2] | [3,4,null] | [1,2,4,null] |
| [] | [1] | [1] |
| null | [2] | null |
| [5,null,5] | [] | [5,null] |

## Demo

What changed between two versions:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ before: [['a', 'b', 'c']], after: [['b', 'c', 'd']] }).select(col('before').list.setSymmetricDifference(col('after')).alias('changed'));
```

| changed |
| --- |
| ["a","d"] |

## See also

[`list.setUnion`](./setUnion), [`list.setIntersection`](./setIntersection), [`list.setDifference`](./setDifference), [`explode`](../frames/explode)
