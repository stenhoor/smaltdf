# `list.len`

The number of elements, nulls included.

```railroad
list-len
```

## Signature

```typescript
expr.list.len(): Expr
```

## Returns

An `int`; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.len().alias('len'));
```

| scores | len |
| --- | --- |
| [3,1,2] | 3 |
| [] | 0 |
| null | null |
| [5,null,5] | 3 |

A column that isn't a list:

<!-- docs:error SMALTDF_TYPE -->
```ts
posts.select(col('id').list.len());
```

## Demo

Rows with more than one tag:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ title: ['a', 'b'], tags: [['x', 'y'], ['z']] }).filter(col('tags').list.len().gt(1));
```

| title | tags |
| --- | --- |
| a | ["x","y"] |

## See also

[`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`list.sum`](./sum), [`explode`](../frames/explode)
