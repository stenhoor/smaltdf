# `list.sum`

The sum of the non-null elements; 0 for none.

```railroad
list-sum
```

## Signature

```typescript
expr.list.sum(): Expr
```

## Returns

Of the element type, `int` or `real`; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of numbers. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.sum().alias('sum'));
```

| scores | sum |
| --- | --- |
| [3,1,2] | 6 |
| [] | 0 |
| null | null |
| [5,null,5] | 10 |

## Demo

The total of each basket:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ basket: [[4.5, 3.25], [2]] }).select(col('basket').list.sum().alias('total'));
```

| total |
| --- |
| 7.75 |
| 2 |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
