# `list.setIntersection`

The elements of both lists, each once.

```railroad
list-setIntersection
```

## Signature

```typescript
expr.list.setIntersection(other: ExprLike): Expr
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

- In this list's order. Null is one value.

## Examples

Of each list:

```ts
const pairs = frame({ a: [[3, 1, 2], [], null, [5, null, 5]], b: [[3, 4, null], [1], [2], []] });
pairs.select('a', 'b', col('a').list.setIntersection(col('b')).alias('both'));
```

| a | b | both |
| --- | --- | --- |
| [3,1,2] | [3,4,null] | [3] |
| [] | [1] | [] |
| null | [2] | null |
| [5,null,5] | [] | [] |

## Demo

The skills a pair share:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ mine: [['ts', 'sql']], yours: [['sql', 'go']] }).select(col('mine').list.setIntersection(col('yours')).alias('shared'));
```

| shared |
| --- |
| ["sql"] |

## See also

[`list.setUnion`](./setUnion), [`list.setDifference`](./setDifference), [`list.setSymmetricDifference`](./setSymmetricDifference), [`explode`](../frames/explode)
