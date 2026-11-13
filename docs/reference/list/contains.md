# `list.contains`

Whether an element equals a value.

```railroad
list-contains
```

## Signature

```typescript
expr.list.contains(item: ExprLike, options?: { nullsEqual?: boolean }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `item` | `ExprLike` | The value to look for: a value, or an expression of the element type. |
| `nullsEqual` | `boolean` | Whether a null `item` finds null elements (default `true`); with `false`, a null `item` gives null. |

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

A null `item`, finding null elements or not:

```ts
const withNulls = frame({ id: [1, 2], scores: [[3, null], [1]] });
withNulls.select('scores', col('scores').list.contains(null).alias('has_null'), col('scores').list.contains(null, { nullsEqual: false }).alias('unknown'));
```

| scores | has_null | unknown |
| --- | --- | --- |
| [3,null] | true | null |
| [1] | false | null |

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
