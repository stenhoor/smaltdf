# `list.setDifference`

The elements of this list that aren't in another, each once.

```railroad
list-setDifference
```

## Signature

```typescript
expr.list.setDifference(other: ExprLike): Expr
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
- Polars can give the elements in another order: see [Compared with Polars](../../guide/polars).

## Examples

Of each list:

```ts
const pairs = frame({ a: [[3, 1, 2], [], null, [5, null, 5]], b: [[3, 4, null], [1], [2], []] });
pairs.select('a', 'b', col('a').list.setDifference(col('b')).alias('only_a'));
```

| a | b | only_a |
| --- | --- | --- |
| [3,1,2] | [3,4,null] | [1,2] |
| [] | [1] | [] |
| null | [2] | null |
| [5,null,5] | [] | [5,null] |

## Demo

The skills only one of a pair has:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ mine: [['ts', 'sql']], yours: [['sql', 'go']] }).select(col('mine').list.setDifference(col('yours')).alias('only_mine'));
```

| only_mine |
| --- |
| ["ts"] |

## See also

[`list.setUnion`](./setUnion), [`list.setIntersection`](./setIntersection), [`list.setSymmetricDifference`](./setSymmetricDifference), [`explode`](../frames/explode)
