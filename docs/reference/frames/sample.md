# `sample`

Rows drawn at random: `n` of them, or a fraction.

```railroad
sample
```

## Signature

```typescript
frame.sample(options: { n?: number; fraction?: number; withReplacement?: boolean; seed?: number }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | How many rows (all of them when there are fewer, without replacement). |
| `fraction` | `number` | The share of rows, from 0, instead of `n`. |
| `withReplacement` | `boolean` | Each draw is any row, so a row can come more than once. Default `false`. |
| `seed` | `number` | The same seed draws the same rows. Without one, each run draws anew. |

## Returns

A frame with the same columns and the rows drawn. Without replacement the rows are distinct and keep the frame's order; with it, they come in the order drawn.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_RANGE` | Neither or both of `n` and `fraction` are given, or one is negative. |

## Examples

Three rows, the same three for the same seed:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.sample({ n: 3, seed: 7 }).select('id');
```

| id |
| --- |
| 1 |
| 2 |
| 4 |

Without a seed, count what comes back rather than which rows:

```ts
orders.sample({ n: 2 }).select(len());
```

| len |
| --- |
| 2 |

## Demo

A sample of a larger frame:

```ts
import { frame, len } from '@smaltworks/smaltdf';

const big = frame({ n: Array.from({ length: 1000 }, (_, i) => i) });
big.sample({ fraction: 0.1, seed: 1 }).select(len());
```

| len |
| --- |
| 100 |

## See also

[`head`](../frames/head), [`filter`](../frames/filter)
