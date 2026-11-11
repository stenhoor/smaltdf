# `cast`

The value converted to another type.

```railroad
cast
```

## Signature

```typescript
expr.cast(to: 'int' | 'real' | 'text' | 'blob' | 'date' | 'datetime'): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `to` | `string` | The type: `int`, `real`, `text`, `blob`, `date` or `datetime`. |

## Returns

The value as `to`, or null for null.

| To | From |
| --- | --- |
| `int` | a whole `real`; text of a whole number; `bool` (1 or 0) |
| `real` | `int`; text of a number |
| `text` | any value, as it prints: a whole `real` with `.0` (`2.0`), a list or struct as JSON |
| `blob` | text (its UTF-8 bytes), a blob |
| `date` | text `YYYY-MM-DD`, a `datetime` (its date) |
| `datetime` | text `YYYY-MM-DD HH:MM:SS[.ffffff]`, a `date` (midnight) |

## Errors

| Code | When |
| --- | --- |
| `SMALT_MISMATCH` | A value doesn't convert: text that isn't a number, a real with a fraction to `int`. |

## Notes

- Conversion is strict: a value that doesn't convert is an error, not null or 0.

## Examples

Text to numbers and dates:

```ts
const raw = frame({ n: ['12', '7'], when: ['2026-11-07', '2026-01-31'] });
raw.select(col('n').cast('int').add(1).alias('n'), col('when').cast('date').dt.month().alias('month'));
```

| n | month |
| --- | --- |
| 13 | 11 |
| 8 | 1 |

Numbers to text:

```ts
frame({ x: [1.5, 2] }).select(col('x').cast('text'));
```

| x |
| --- |
| 1.5 |
| 2.0 |

Text that isn't a number:

<!-- docs:error SMALT_MISMATCH -->
```ts
frame({ n: ['twelve'] }).select(col('n').cast('int'));
```

## Demo

Parsing a column of text:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ price: ['4.50', '3.25', '10'] }).select(col('price').cast('real').mul(2).alias('double'));
```

| double |
| --- |
| 9 |
| 6.5 |
| 20 |

## See also

[`lit`](./lit), [`str.toDate`](../str/toDate), [`str.toDatetime`](../str/toDatetime)
