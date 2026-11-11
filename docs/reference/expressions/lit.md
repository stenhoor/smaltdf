# `lit`

A constant: the same value on every row.

```railroad
lit
```

## Signature

```typescript
lit(value: number | bigint | string | boolean | Uint8Array | Date | null): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `value` | `value` | The constant. |

## Returns

The value on every row, named `literal`, of the type its value has:

| Value | Type |
| --- | --- |
| a whole number, a bigint | `int` |
| a number with a fraction, NaN, Infinity | `real` |
| a string | `text` |
| a boolean | `bool` |
| a `Uint8Array` | `blob` |
| a `Date` | `datetime` |
| `null` | `null`, which fits any type |

## Errors

None of its own.

## Notes

- A method's operand can be a value without `lit`: `col('qty').add(1)`. `lit` is for a constant column, or a constant first operand: `lit(100).sub(col('pct'))`.

## Examples

Constant columns:

```ts
const rows = frame({ id: [1, 2] });
rows.select('id', lit('new').alias('status'), lit(true).alias('flag'), lit(null).alias('nothing'));
```

| id | status | flag | nothing |
| --- | --- | --- | --- |
| 1 | new | true | null |
| 2 | new | true | null |

A constant first operand:

```ts
rows.select(lit(100).sub(col('id')).alias('left'));
```

| left |
| --- |
| 99 |
| 98 |

## Demo

A tag on every row:

```ts
import { frame, lit } from '@smaltworks/smaltdf';

frame({ n: [1, 2, 3] }).withColumns(lit('batch-7').alias('batch'));
```

| n | batch |
| --- | --- |
| 1 | batch-7 |
| 2 | batch-7 |
| 3 | batch-7 |

## See also

[`col`](./col), [`cast`](./cast), [`alias`](./alias)
