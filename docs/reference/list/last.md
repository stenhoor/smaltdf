# `list.last`

The last element, or null for an empty list.

```railroad
list-last
```

## Signature

```typescript
expr.list.last(): Expr
```

## Returns

The element, of the list's element type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Notes

- The same as `list.get(-1)`.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.last().alias('last'));
```

| scores | last |
| --- | --- |
| [3,1,2] | 2 |
| [] | null |
| null | null |
| [5,null,5] | 5 |

## Demo

The last stop of each route:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ route: [['Oslo', 'Bergen'], ['Rome']] }).select(col('route').list.last().alias('to'));
```

| to |
| --- |
| Bergen |
| Rome |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
