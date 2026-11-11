# `list.concat`

The list's elements, then another's.

```railroad
list-concat
```

## Signature

```typescript
expr.list.concat(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | A list of the same element type. |

## Returns

A list of the same type; null when either is null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The values aren't lists of one element type. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.concat(col('scores')).alias('twice'));
```

| scores | twice |
| --- | --- |
| [3,1,2] | [3,1,2,3,1,2] |
| [] | [] |
| null | null |
| [5,null,5] | [5,null,5,5,null,5] |

## Demo

Two lists as one:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ am: [['tea']], pm: [['cake', 'jam']] }).select(col('am').list.concat(col('pm')).alias('day'));
```

| day |
| --- |
| ["tea","cake","jam"] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
