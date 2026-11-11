# `round`

The number rounded to `digits` decimal places, half to even.

```railroad
round
```

## Signature

```typescript
expr.round(digits?: number): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `digits` | `number` | Decimal places: a whole number from 0 to 30 (a negative number counts as 0, a larger one as 30). Default 0. |

## Returns

A `real`, or null for null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a number, or `digits` isn't a whole number. |

## Notes

- Half to even: 2.5 rounds to 2 and 3.5 to 4, so rounding many values doesn't drift upward.
- A half is decided on the number's exact binary value: 2.675 is stored as slightly less, so it rounds to 2.67.

## Examples

Halves go to the even neighbour:

```ts
const vals = frame({ x: [2.5, 3.5, -2.5, 1.25, 2.675] });
vals.select('x', col('x').round().alias('r0'), col('x').round(1).alias('r1'), col('x').round(2).alias('r2'));
```

| x | r0 | r1 | r2 |
| --- | --- | --- | --- |
| 2.5 | 2 | 2.5 | 2.5 |
| 3.5 | 4 | 3.5 | 3.5 |
| -2.5 | -2 | -2.5 | -2.5 |
| 1.25 | 1 | 1.2 | 1.25 |
| 2.675 | 3 | 2.7 | 2.67 |

## Demo

Prices to cents:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ net: [9.99, 4.5] }).select(col('net').mul(1.19).round(2).alias('gross'));
```

| gross |
| --- |
| 11.89 |
| 5.35 |

## See also

[`div`](./div), [`cast`](./cast)
