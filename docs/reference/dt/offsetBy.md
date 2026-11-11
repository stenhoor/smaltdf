# `dt.offsetBy`

The value moved by a span of calendar time, or by a `duration`.

```railroad
dt-offsetBy
```

## Signature

```typescript
expr.dt.offsetBy(by: string | Expr): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `by` | `string \\| Expr` | Text such as `1mo`, `-2d` or `1y3mo` (units `y`, `q`, `mo`, `w`, `d`, `h`, `m`, `s`, `ms`, `us`), or a `duration` expression. |

## Returns

Of the value's type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `date` or `datetime`, or `by` isn't text or a `duration`. |
| `SMALT_MISMATCH` | The text of `by` isn't a span. |

## Notes

- Months and years keep the day of the month, or take the last day of a shorter month: January 31 plus `1mo` is February 28 (29 in a leap year).

## Examples

Calendar spans:

```ts
const days = frame({ d: ['2026-01-31', '2024-02-29'] }).select(col('d').cast('date'));
days.select('d', col('d').dt.offsetBy('1mo').alias('plus_1mo'), col('d').dt.offsetBy('1y').alias('plus_1y'), col('d').dt.offsetBy('-2w').alias('minus_2w'));
```

| d | plus_1mo | plus_1y | minus_2w |
| --- | --- | --- | --- |
| 2026-01-31 | 2026-02-28 | 2027-01-31 | 2026-01-17 |
| 2024-02-29 | 2024-03-29 | 2025-02-28 | 2024-02-15 |

## Demo

Due dates a month after each invoice:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ invoiced: ['2026-01-15', '2026-03-31'] }).select('invoiced', col('invoiced').cast('date').dt.offsetBy('1mo').alias('due'));
```

| invoiced | due |
| --- | --- |
| 2026-01-15 | 2026-02-15 |
| 2026-03-31 | 2026-04-30 |

## See also

[`dt.truncate`](./truncate), [`add`](../expressions/add)
