# `list.argMin`

The position of the smallest non-null element; null for none.

```railroad
list-argMin
```

## Signature

```typescript
expr.list.argMin(): Expr
```

## Returns

`int`, counting from 0; null for a null list or one with no non-null element.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Notes

- Of equal elements, the first.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.argMin().alias('at'));
```

| scores | at |
| --- | --- |
| [3,1,2] | 1 |
| [] | null |
| null | null |
| [5,null,5] | 0 |

## Demo

The day of the lowest price:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ prices: [[4.2, 3.9, 4.0, 3.9]] }).select(col('prices').list.argMin().alias('cheapest_day'));
```

| cheapest_day |
| --- |
| 1 |

## See also

[`list.median`](./median), [`list.std`](./std), [`list.var`](./var), [`list.nUnique`](./nUnique), [`explode`](../frames/explode)
