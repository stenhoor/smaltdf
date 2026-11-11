# `mul`

The product of two numbers, or a `duration` times an `int`.

```railroad
mul
```

## Signature

```typescript
expr.mul(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | An expression or a JavaScript value: the right-hand operand. |

## Returns

`int` when both operands are `int`, `real` when either is `real`. Null when either is null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | An operand isn't a number. |
| `SMALT_RANGE` | An `int` result overflows 64 bits. |

## Notes

- Integer overflow is an error.

## Examples

Row by row:

```ts
const nums = frame({ a: [7, -7, 5, null], b: [2, 2, 0.5, 3] });
nums.select('a', 'b', col('a').mul(col('b')).alias('result'));
```

| a | b | result |
| --- | --- | --- |
| 7 | 2 | 14 |
| -7 | 2 | -14 |
| 5 | 0.5 | 2.5 |
| null | 3 | null |

## Demo

A computed column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ price: [4.5, 3], qty: [2, 4] }).select(col('price').mul(col('qty')).alias('total'));
```

| total |
| --- |
| 9 |
| 12 |

## See also

[`add`](./add), [`sub`](./sub), [`div`](./div), [`floorDiv`](./floorDiv), [`mod`](./mod)
