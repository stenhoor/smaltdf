# `list.first`

The first element, or null for an empty list.

```railroad
list-first
```

## Signature

```typescript
expr.list.first(): Expr
```

## Returns

The element, of the list's element type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Notes

- The same as `list.get(0)`.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.first().alias('first'));
```

| scores | first |
| --- | --- |
| [3,1,2] | 3 |
| [] | null |
| null | null |
| [5,null,5] | 5 |

## Demo

The first stop of each route:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ route: [['Oslo', 'Bergen'], ['Rome']] }).select(col('route').list.first().alias('from'));
```

| from |
| --- |
| Oslo |
| Rome |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
