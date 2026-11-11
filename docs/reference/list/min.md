# `list.min`

The smallest non-null element; null for none.

```railroad
list-min
```

## Signature

```typescript
expr.list.min(): Expr
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
posts.select('scores', col('scores').list.min().alias('min'));
```

| scores | min |
| --- | --- |
| [3,1,2] | 1 |
| [] | null |
| null | null |
| [5,null,5] | 5 |

## Demo

The cheapest of each list:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ prices: [[4.5, 3.25, 9]] }).select(col('prices').list.min());
```

| prices |
| --- |
| 3.25 |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
