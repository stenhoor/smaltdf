# `sub`

The difference of two numbers, or of two dates or times (a `duration`).

```railroad
sub
```

## Signature

```typescript
expr.sub(other: ExprLike): Expr
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
- `datetime - datetime`, `date - date` and `time - time` are `duration`s; a date or time minus a `duration` is moved back.

## Examples

Row by row:

```ts
const nums = frame({ a: [7, -7, 5, null], b: [2, 2, 0.5, 3] });
nums.select('a', 'b', col('a').sub(col('b')).alias('result'));
```

| a | b | result |
| --- | --- | --- |
| 7 | 2 | 5 |
| -7 | 2 | -9 |
| 5 | 0.5 | 4.5 |
| null | 3 | null |

## Demo

A computed column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ start: [10, 3], end: [25, 9] }).select(col('end').sub(col('start')).alias('length'));
```

| length |
| --- |
| 15 |
| 6 |

## See also

[`add`](./add), [`mul`](./mul), [`div`](./div), [`floorDiv`](./floorDiv), [`mod`](./mod)
