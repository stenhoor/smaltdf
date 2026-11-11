# `div`

True division: the quotient as a `real`.

```railroad
div
```

## Signature

```typescript
expr.div(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | An expression or a JavaScript value: the right-hand operand. |

## Returns

A `real`, or null when either is null. A non-zero number divided by zero is `Infinity` or `-Infinity`; `0 / 0` is NaN.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | An operand isn't a number. |

## Notes

- Always `real`: `7 / 2` is 3.5.

## Examples

Row by row; dividing by 0.5 doubles:

```ts
const nums = frame({ a: [7, -7, 5, null], b: [2, 2, 0.5, 3] });
nums.select('a', 'b', col('a').div(col('b')).alias('result'));
```

| a | b | result |
| --- | --- | --- |
| 7 | 2 | 3.5 |
| -7 | 2 | -3.5 |
| 5 | 0.5 | 10 |
| null | 3 | null |

Division by zero:

```ts
frame({ x: [1, -1, 0] }).select(col('x').div(0).alias('q'));
```

| q |
| --- |
| Infinity |
| -Infinity |
| NaN |

## Demo

A computed column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ km: [12, 40], hours: [0.5, 2] }).select(col('km').div(col('hours')).alias('kmh'));
```

| kmh |
| --- |
| 24 |
| 20 |

## See also

[`add`](./add), [`sub`](./sub), [`mul`](./mul), [`floorDiv`](./floorDiv), [`mod`](./mod)
