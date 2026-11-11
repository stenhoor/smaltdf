# `add`

The sum of two numbers, or a date or time moved by a `duration`.

```railroad
add
```

## Signature

```typescript
expr.add(other: ExprLike): Expr
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

- Integer overflow is an error, not a wrap-around or a real.
- A `datetime`, `date` or `time` plus a `duration` is moved by it; two durations add.

## Examples

Row by row (null where either is null):

```ts
const nums = frame({ a: [7, -7, 5, null], b: [2, 2, 0.5, 3] });
nums.select('a', 'b', col('a').add(col('b')).alias('result'));
```

| a | b | result |
| --- | --- | --- |
| 7 | 2 | 9 |
| -7 | 2 | -5 |
| 5 | 0.5 | 5.5 |
| null | 3 | null |

Overflow is an error:

<!-- docs:error SMALT_RANGE -->
```ts
frame({ big: [9223372036854775807n] }).select(col('big').add(1));
```

## Demo

A computed column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ net: [10, 20], tax: [2, 4] }).select(col('net').add(col('tax')).alias('gross'));
```

| gross |
| --- |
| 12 |
| 24 |

## See also

[`sub`](./sub), [`mul`](./mul), [`div`](./div), [`floorDiv`](./floorDiv), [`mod`](./mod)
