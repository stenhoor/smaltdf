# `list.max`

The largest non-null element; null for none.

```railroad
list-max
```

## Signature

```typescript
expr.list.max(): Expr
```

## Returns

Of the element type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of numbers. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.max().alias('max'));
```

| scores | max |
| --- | --- |
| [3,1,2] | 3 |
| [] | null |
| null | null |
| [5,null,5] | 5 |

## Demo

The best of each list:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ tries: [[7, 9, 8]] }).select(col('tries').list.max());
```

| tries |
| --- |
| 9 |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
