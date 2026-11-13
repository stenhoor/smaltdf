# `list.diff`

Each element less the one before it.

```railroad
list-diff
```

## Signature

```typescript
expr.list.diff(n?: number): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | How far back: the element `n` places before. Default 1. |

## Returns

A list of `int` for `int` elements, `real` for `real`, `duration` for durations; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of numbers or durations. |
| `SMALTDF_RANGE` | `n` is not a whole number. |

## Notes

- The first `n` elements have nothing before them: null. So is an element next to a null.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.diff().alias('change'));
```

| scores | change |
| --- | --- |
| [3,1,2] | [null,-2,1] |
| [] | [] |
| null | null |
| [5,null,5] | [null,null,null] |

## Demo

The distance driven each day:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ odometer: [[1200, 1260, 1345]] }).select(col('odometer').list.diff().alias('driven'));
```

| driven |
| --- |
| [null,60,85] |

## See also

[`list.dropNulls`](./dropNulls), [`list.shift`](./shift), [`list.gather`](./gather), [`list.gatherEvery`](./gatherEvery), [`explode`](../frames/explode)
