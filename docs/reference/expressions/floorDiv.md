# `floorDiv`

Division rounded toward negative infinity.

```railroad
floorDiv
```

## Signature

```typescript
expr.floorDiv(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | An expression or a JavaScript value: the right-hand operand. |

## Returns

`int` when both are `int`, `real` (a whole number) otherwise. Null when either is null, and for integer division by zero.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | An operand isn't a number. |

## Notes

- `-7 // 2` is -4, not -3: the result is rounded down, not toward zero.

## Examples

Row by row:

```ts
const nums = frame({ a: [7, -7, 5, null], b: [2, 2, 0.5, 3] });
nums.select('a', 'b', col('a').floorDiv(col('b')).alias('result'));
```

| a | b | result |
| --- | --- | --- |
| 7 | 2 | 3 |
| -7 | 2 | -4 |
| 5 | 0.5 | 10 |
| null | 3 | null |

## Demo

A computed column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ cents: [250, 199, -50] }).select(col('cents').floorDiv(100).alias('euros'));
```

| euros |
| --- |
| 2 |
| 1 |
| -1 |

## See also

[`add`](./add), [`sub`](./sub), [`mul`](./mul), [`div`](./div), [`mod`](./mod)
