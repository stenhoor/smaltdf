# `list.setUnion`

The elements of either list, each once.

```railroad
list-setUnion
```

## Signature

```typescript
expr.list.setUnion(other: ExprLike): Expr
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

- First-appearance order: this list's elements, then the other's that are new. Null is one value.

## Examples

Of each list:

```ts
const pairs = frame({ a: [[3, 1, 2], [], null, [5, null, 5]], b: [[3, 4, null], [1], [2], []] });
pairs.select('a', 'b', col('a').list.setUnion(col('b')).alias('union'));
```

| a | b | union |
| --- | --- | --- |
| [3,1,2] | [3,4,null] | [3,1,2,4,null] |
| [] | [1] | [1] |
| null | [2] | null |
| [5,null,5] | [] | [5,null] |

## Demo

The skills of a pair:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ mine: [['ts', 'sql']], yours: [['sql', 'go']] }).select(col('mine').list.setUnion(col('yours')).alias('ours'));
```

| ours |
| --- |
| ["ts","sql","go"] |

## See also

[`list.setIntersection`](./setIntersection), [`list.setDifference`](./setDifference), [`list.setSymmetricDifference`](./setSymmetricDifference), [`explode`](../frames/explode)
