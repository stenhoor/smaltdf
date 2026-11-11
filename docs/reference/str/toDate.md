# `str.toDate`

Text read as a `date`: in the result format, or with a `strftime` format.

```railroad
str-toDate
```

## Signature

```typescript
expr.str.toDate(format?: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `format` | `string` | A `strftime` format such as `%d/%m/%Y`. Without it, the text is `YYYY-MM-DD`. |

## Returns

A `date`, or null for null. `collect` gives it as text, `2026-11-07`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't text. |
| `SMALT_MISMATCH` | The text isn't a date in that format. |

## Notes

- The format codes are those of [`dt.strftime`](../dt/strftime).

## Examples

Two formats:

```ts
const raw = frame({ iso: ['2026-11-07', '2025-02-28'], eu: ['07/11/2026', '28/02/2025'] });
raw.select(col('iso').str.toDate().alias('iso'), col('eu').str.toDate('%d/%m/%Y').alias('eu'));
```

| iso | eu |
| --- | --- |
| 2026-11-07 | 2026-11-07 |
| 2025-02-28 | 2025-02-28 |

Text that isn't a date:

<!-- docs:error SMALT_MISMATCH -->
```ts
frame({ d: ['2026-02-30'] }).select(col('d').str.toDate());
```

## Demo

Dates from text, then a part of them:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ due: ['2026-03-15', '2026-12-01'] }).select(col('due').str.toDate().dt.month().alias('month'));
```

| month |
| --- |
| 3 |
| 12 |

## See also

[`str.toDatetime`](./toDatetime), [`cast`](../expressions/cast), [`dt.strftime`](../dt/strftime)
