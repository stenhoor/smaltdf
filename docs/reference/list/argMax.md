# `list.argMax`

The position of the largest non-null element; null for none.

```railroad
list-argMax
```

## Signature

```typescript
expr.list.argMax(): Expr
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
posts.select('scores', col('scores').list.argMax().alias('at'));
```

| scores | at |
| --- | --- |
| [3,1,2] | 0 |
| [] | null |
| null | null |
| [5,null,5] | 0 |

## Demo

The hour of the highest temperature:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ temps: [[18, 24, 21, 24]] }).select(col('temps').list.argMax().alias('warmest_hour'));
```

| warmest_hour |
| --- |
| 1 |

## See also

[`list.median`](./median), [`list.std`](./std), [`list.var`](./var), [`list.nUnique`](./nUnique), [`explode`](../frames/explode)
