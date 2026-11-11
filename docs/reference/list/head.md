# `list.head`

The first `n` elements.

```railroad
list-head
```

## Signature

```typescript
expr.list.head(n?: number): Expr
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
posts.select('scores', col('scores').list.head(2).alias('head'));
```

| scores | head |
| --- | --- |
| [3,1,2] | [3,1] |
| [] | [] |
| null | null |
| [5,null,5] | [5,null] |

## Demo

The top three of each sorted list:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ times: [[9.8, 9.9, 10.1, 10.3]] }).select(col('times').list.sort().list.head(3).alias('podium'));
```

| podium |
| --- |
| [9.8,9.9,10.1] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sort`](./sort), [`explode`](../frames/explode)
