# `list.nUnique`

The number of distinct elements, null counting as one.

```railroad
list-nUnique
```

## Signature

```typescript
expr.list.nUnique(): Expr
```

## Returns

`int`; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.nUnique().alias('distinct'));
```

| scores | distinct |
| --- | --- |
| [3,1,2] | 3 |
| [] | 0 |
| null | null |
| [5,null,5] | 2 |

## Demo

How many different pages each visitor saw:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ visits: [['home', 'docs', 'home', 'blog']] }).select(col('visits').list.nUnique().alias('pages'));
```

| pages |
| --- |
| 3 |

## See also

[`list.median`](./median), [`list.std`](./std), [`list.var`](./var), [`list.argMin`](./argMin), [`explode`](../frames/explode)
