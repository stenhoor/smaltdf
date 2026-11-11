# `str.toDatetime`

Text read as a `datetime`: in the result format, or with a `strftime` format.

```railroad
str-toDatetime
```

## Signature

```typescript
expr.str.toDatetime(format?: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `format` | `string` | A `strftime` format. Without it, the text is `YYYY-MM-DD HH:MM:SS`, with an optional fraction. |

## Returns

A `datetime`, or null for null. `collect` gives it as a JS `Date`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't text. |
| `SMALT_MISMATCH` | The text isn't a datetime in that format. |

## Examples

Two formats:

```ts
const raw = frame({ a: ['2026-11-07 13:04:05'], b: ['07.11.2026 13:04'] });
raw.select(col('a').str.toDatetime().alias('a'), col('b').str.toDatetime('%d.%m.%Y %H:%M').alias('b'));
```

| a | b |
| --- | --- |
| 2026-11-07 13:04:05 | 2026-11-07 13:04:00 |

## Demo

Hours from a log:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ at: ['2026-11-07 08:15:00', '2026-11-07 17:40:00'] }).select(col('at').str.toDatetime().dt.hour().alias('hour'));
```

| hour |
| --- |
| 8 |
| 17 |

## See also

[`str.toDate`](./toDate), [`cast`](../expressions/cast), [`Dates and times`](../../guide/dates-and-times)
