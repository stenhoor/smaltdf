# `mod`

The remainder of floor division, with the sign of the divisor.

```railroad
mod
```

## Signature

```typescript
expr.mod(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | An expression or a JavaScript value: the right-hand operand. |

## Returns

`int` when both are `int`, `real` otherwise. Null when either is null, and for integer modulo zero.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | An operand isn't a number. |

## Notes

- `-7 % 2` is 1: `a` equals `b * a.floorDiv(b) + a.mod(b)`.

## Examples

Row by row:

```ts
const nums = frame({ a: [7, -7, 5, null], b: [2, 2, 0.5, 3] });
nums.select('a', 'b', col('a').mod(col('b')).alias('result'));
```

| a | b | result |
| --- | --- | --- |
| 7 | 2 | 1 |
| -7 | 2 | 1 |
| 5 | 0.5 | 0 |
| null | 3 | null |

## Demo

A computed column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ minutes: [125, 59, -5] }).select(col('minutes').mod(60).alias('past_the_hour'));
```

| past_the_hour |
| --- |
| 5 |
| 59 |
| 55 |

## See also

[`add`](./add), [`sub`](./sub), [`mul`](./mul), [`div`](./div), [`floorDiv`](./floorDiv)
