# `dt.strftime`

The value written as text with a `strftime` format.

```railroad
dt-strftime
```

## Signature

```typescript
expr.dt.strftime(format: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `format` | `string` | Text with codes: `%Y` year, `%m` month, `%d` day, `%H` hour, `%M` minute, `%S` second, `%f` µs, `%j` day of the year, `%u` ISO weekday, `%%` a percent sign; other text as it is. |

## Returns

`text`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a date or time. |

## Examples

Several formats:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.filter(col('at').isNotNull()).select(col('at').dt.strftime('%d/%m/%Y').alias('eu'), col('at').dt.strftime('%Y-%m-%dT%H:%M:%SZ').alias('iso'), col('at').dt.strftime('day %j').alias('nth'));
```

| eu | iso | nth |
| --- | --- | --- |
| 07/11/2026 | 2026-11-07T13:04:05Z | day 311 |
| 29/02/2024 | 2024-02-29T23:59:59Z | day 060 |

## Demo

Labels for a chart:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ month: ['2026-01-01', '2026-02-01'] }).select(col('month').cast('date').dt.strftime('%m/%Y').alias('label'));
```

| label |
| --- |
| 01/2026 |
| 02/2026 |

## See also

[`str.toDate`](../str/toDate), [`cast`](../expressions/cast)
