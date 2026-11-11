# `tail`

The last `n` rows.

```railroad
tail
```

## Signature

```typescript
frame.tail(n?: number): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | How many rows: a whole number, 0 or more. Default 5. |

## Returns

A frame with the same columns and the last `n` rows, in the frame's order.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_RANGE` | `n` isn't a whole number of 0 or more. |

## Examples

The last two rows:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.tail(2);
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 4 | e | null | 3 |
| 5 | s | 5 | 2 |

## Demo

The latest readings:

```ts
import { frame } from '@smaltworks/smaltdf';

frame({ t: [1, 2, 3, 4], value: [10, 12, 9, 14] }).sort('t').tail(2);
```

| t | value |
| --- | --- |
| 3 | 9 |
| 4 | 14 |

## See also

[`head`](../frames/head), [`slice`](../frames/slice)
