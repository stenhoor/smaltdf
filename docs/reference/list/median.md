# `list.median`

The median of the non-null elements; null for none.

```railroad
list-median
```

## Signature

```typescript
expr.list.median(): Expr
```

## Returns

`real`; null for a null list, or one with no numbers.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of numbers. |

## Notes

- An even number of elements gives the mean of the middle two.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.median().alias('median'));
```

| scores | median |
| --- | --- |
| [3,1,2] | 2 |
| [] | null |
| null | null |
| [5,null,5] | 5 |

## Demo

The typical response time of each request batch:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ times: [[120, 95, 300, 101]] }).select(col('times').list.median().alias('typical'));
```

| typical |
| --- |
| 110.5 |

## See also

[`list.std`](./std), [`list.var`](./var), [`list.nUnique`](./nUnique), [`list.argMin`](./argMin), [`explode`](../frames/explode)
