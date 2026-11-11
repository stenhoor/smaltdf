# `sort`

Rows ordered by one or more expressions. Stable: equal rows keep their order.

```railroad
sort
```

## Signature

```typescript
frame.sort(by: Expr | string | readonly (Expr | string)[], options?: { descending?: boolean | boolean[]; nullsLast?: boolean | boolean[] }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `by` | `Expr \\| string \\| (Expr \\| string)[]` | What to order by: a column, an expression, or several, compared in turn. |
| `descending` | `boolean \\| boolean[]` | Largest first; one for all keys, or one per key. Default `false`. |
| `nullsLast` | `boolean \\| boolean[]` | Nulls after the other values; one for all keys, or one per key. Default `false`: nulls first. |

## Returns

A frame with the same columns and rows, in the new order.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A key names a column the frame doesn't have. |
| `SMALTDF_RANGE` | A list of `descending` or `nullsLast` has another length than the keys. |

## Notes

- Numbers compare as numbers and text by code point. NaN sorts after every number, Infinity included.
- Rows whose keys are equal keep the order they had.

## Examples

Largest first, nulls last:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.sort('qty', { descending: true, nullsLast: true });
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 2 | s | 12 | 1 |
| 3 | n | 7 | 4 |
| 5 | s | 5 | 2 |
| 1 | n | 3 | 2.5 |
| 4 | e | null | 3 |

Two keys, one descending:

```ts
orders.sort(['region', 'price'], { descending: [false, true] });
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 4 | e | null | 3 |
| 3 | n | 7 | 4 |
| 1 | n | 3 | 2.5 |
| 5 | s | 5 | 2 |
| 2 | s | 12 | 1 |

## Demo

A leaderboard:

```ts
import { frame } from '@smaltworks/smaltdf';

const scores = frame({ player: ['ann', 'bo', 'cy', 'di'], points: [30, 45, 30, 12] });
scores.sort('points', { descending: true });
```

| player | points |
| --- | --- |
| bo | 45 |
| ann | 30 |
| cy | 30 |
| di | 12 |

## See also

[`head`](../frames/head), [`filter`](../frames/filter), [`rank`](../windows/rank)
