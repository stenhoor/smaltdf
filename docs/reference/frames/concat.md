# `concat`

The frames' rows one after another: the first frame's, then the next one's.

```railroad
concat
```

## Signature

```typescript
concat(frames: readonly Frame[]): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `frames` | `readonly Frame[]` | At least one frame. All have the same column names, in the same order. |

## Returns

A frame with the first frame's columns, and the rows of each frame in turn, each in its own order.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A frame has other column names, or the same names in another order. |
| `SMALTDF_TYPE` | A column has a different type in two of the frames. |
| `SMALTDF_RANGE` | The list of frames is empty. |

## Notes

- A column of `int` and one of only nulls combine into `int`.

## Examples

Two months of sales:

```ts
const jan = frame({ day: [1, 2], amount: [10, 20] });
const feb = frame({ day: [1], amount: [15] });
concat([jan, feb]);
```

| day | amount |
| --- | --- |
| 1 | 10 |
| 2 | 20 |
| 1 | 15 |

Different columns are an error:

<!-- docs:error SMALTDF_SCHEMA -->
```ts
concat([jan, frame({ amount: [5], day: [3] })]);
```

## Demo

Three frames as one:

```ts
import { concat, frame } from '@smaltworks/smaltdf';

const a = frame({ k: ['x'], n: [1] });
const b = frame({ k: ['y', 'z'], n: [2, 3] });
const c = frame({ k: ['w'], n: [4] });
concat([a, b, c]);
```

| k | n |
| --- | --- |
| x | 1 |
| y | 2 |
| z | 3 |
| w | 4 |

## See also

[`frame`](../frames/frame), [`join`](../frames/join), [`Joins and concatenation`](../../guide/joins)
