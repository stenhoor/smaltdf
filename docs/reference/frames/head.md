# `head`

The first `n` rows.

```railroad
head
```

## Signature

```typescript
frame.head(n?: number): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | How many rows: a whole number, 0 or more. Default 5. |

## Returns

A frame with the same columns and the first `n` rows (all of them when there are fewer).

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_RANGE` | `n` isn't a whole number of 0 or more. |

## Notes

- "First" follows the frame's order: sort first for a meaningful top `n`.

## Examples

The two largest orders:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.sort('qty', { descending: true, nullsLast: true }).head(2);
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 2 | s | 12 | 1 |
| 3 | n | 7 | 4 |

## Demo

A preview:

```ts
import { frame } from '@smaltworks/smaltdf';

frame({ n: [1, 2, 3, 4, 5, 6, 7] }).head(3);
```

| n |
| --- |
| 1 |
| 2 |
| 3 |

## See also

[`tail`](../frames/tail), [`slice`](../frames/slice), [`sort`](../frames/sort)
