# `slice`

`n` rows from position `offset`, or all of them from there.

```railroad
slice
```

## Signature

```typescript
frame.slice(offset: number, n?: number): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `offset` | `number` | The first row, counted from 0: a whole number, 0 or more. |
| `n` | `number` | How many rows, 0 or more; all the rest when it is left out. |

## Returns

A frame with the same columns and those rows, in the frame's order.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_RANGE` | `offset` or `n` isn't a whole number of 0 or more. |

## Examples

Rows 2 and 3 (from 0: the second page of two):

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.slice(2, 2);
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 3 | n | 7 | 4 |
| 4 | e | null | 3 |

From row 3 to the end:

```ts
orders.slice(3);
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 4 | e | null | 3 |
| 5 | s | 5 | 2 |

A negative offset is an error: use `tail` for rows from the end.

<!-- docs:error SMALTDF_RANGE -->
```ts
orders.slice(-2);
```

## Demo

Pages of results:

```ts
import { frame } from '@smaltworks/smaltdf';

const words = frame({ w: ['a', 'b', 'c', 'd', 'e', 'f'] });
const pageSize = 2;
words.slice(1 * pageSize, pageSize);
```

| w |
| --- |
| c |
| d |

## See also

[`head`](../frames/head), [`tail`](../frames/tail)
