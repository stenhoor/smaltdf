# `list.gatherEvery`

Every `n`-th element.

```railroad
list-gatherEvery
```

## Signature

```typescript
expr.list.gatherEvery(n: number, offset?: number): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | The step: 1 every element, 2 every other one. |
| `offset` | `number` | The position to start from. Default 0. |

## Returns

A list of the same type; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |
| `SMALTDF_RANGE` | `n` or `offset` is not a whole number. |
| `SMALT_RANGE` | `n` is not positive, or `offset` is negative. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.gatherEvery(2).alias('even'), col('scores').list.gatherEvery(2, 1).alias('odd'));
```

| scores | even | odd |
| --- | --- | --- |
| [3,1,2] | [3,2] | [1] |
| [] | [] | [] |
| null | null | null |
| [5,null,5] | [5,5] | [null] |

## Demo

Every third frame:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ frames: [[0, 1, 2, 3, 4, 5, 6]] }).select(col('frames').list.gatherEvery(3).alias('keyframes'));
```

| keyframes |
| --- |
| [0,3,6] |

## See also

[`list.dropNulls`](./dropNulls), [`list.shift`](./shift), [`list.diff`](./diff), [`list.gather`](./gather), [`explode`](../frames/explode)
