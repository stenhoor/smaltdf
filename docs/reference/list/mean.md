# `list.mean`

The mean of the non-null elements; null for none.

```railroad
list-mean
```

## Signature

```typescript
expr.list.mean(): Expr
```

## Returns

A `real`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of numbers. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.mean().alias('mean'));
```

| scores | mean |
| --- | --- |
| [3,1,2] | 2 |
| [] | null |
| null | null |
| [5,null,5] | 5 |

## Demo

The average of each list:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ marks: [[60, 80], [70]] }).select(col('marks').list.mean());
```

| marks |
| --- |
| 70 |
| 70 |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
