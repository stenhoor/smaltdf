# `list.reverse`

The elements in reverse order.

```railroad
list-reverse
```

## Signature

```typescript
expr.list.reverse(): Expr
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
posts.select('scores', col('scores').list.reverse().alias('reversed'));
```

| scores | reversed |
| --- | --- |
| [3,1,2] | [2,1,3] |
| [] | [] |
| null | null |
| [5,null,5] | [5,null,5] |

## Demo

Newest first:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ log: [['start', 'run', 'stop']] }).select(col('log').list.reverse());
```

| log |
| --- |
| ["stop","run","start"] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
