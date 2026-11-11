# `list.unique`

The elements without repeats: the first of each, in order.

```railroad
list-unique
```

## Signature

```typescript
expr.list.unique(): Expr
```

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
posts.select('scores', col('scores').list.unique().alias('unique'));
```

| scores | unique |
| --- | --- |
| [3,1,2] | [3,1,2] |
| [] | [] |
| null | null |
| [5,null,5] | [5,null] |

## Demo

Distinct visitors per page:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ visitors: [['ann', 'bo', 'ann', 'cy', 'bo']] }).select(col('visitors').list.unique());
```

| visitors |
| --- |
| ["ann","bo","cy"] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
