# `list.tail`

The last `n` elements.

```railroad
list-tail
```

## Signature

```typescript
expr.list.tail(n?: number): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | How many. Default 5. |

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
posts.select('scores', col('scores').list.tail(2).alias('tail'));
```

| scores | tail |
| --- | --- |
| [3,1,2] | [1,2] |
| [] | [] |
| null | null |
| [5,null,5] | [null,5] |

## Demo

The two latest values:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ history: [[1, 2, 3, 4]] }).select(col('history').list.tail(2).alias('recent'));
```

| recent |
| --- |
| [3,4] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
