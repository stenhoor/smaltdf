# `list.slice`

The elements from a position, `length` of them or all the rest.

```railroad
list-slice
```

## Signature

```typescript
expr.list.slice(offset: ExprLike, length?: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `offset` | `ExprLike` | The first position, from 0; negative from the end. |
| `length` | `ExprLike` | How many elements; all the rest when it is left out. |

## Returns

A list of the same type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.slice(1).alias('rest'), col('scores').list.slice(-2, 1).alias('one'));
```

| scores | rest | one |
| --- | --- | --- |
| [3,1,2] | [1,2] | [1] |
| [] | [] | [] |
| null | null | null |
| [5,null,5] | [null,5] | [null] |

## Demo

All but the first:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ steps: [['plan', 'build', 'test']] }).select(col('steps').list.slice(1).alias('after_plan'));
```

| after_plan |
| --- |
| ["build","test"] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.sort`](./sort), [`list.sum`](./sum), [`explode`](../frames/explode)
