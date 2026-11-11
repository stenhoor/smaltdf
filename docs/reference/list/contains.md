# `list.contains`

Whether an element equals a value.

```railroad
list-contains
```

## Signature

```typescript
expr.list.contains(item: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `item` | `ExprLike` | The value to look for: a value, or an expression of the element type. |

## Returns

A `bool`: false for an empty list, null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list, or `item` isn't of its element type. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.contains(5).alias('has_5'));
```

| scores | has_5 |
| --- | --- |
| [3,1,2] | false |
| [] | false |
| null | null |
| [5,null,5] | true |

## Demo

Posts tagged `news`:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ id: [1, 2], tags: [['news', 'tech'], ['sport']] }).filter(col('tags').list.contains('news'));
```

| id | tags |
| --- | --- |
| 1 | ["news","tech"] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
