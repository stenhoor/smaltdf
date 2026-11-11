# `dt.fromZone`

The UTC instant of a wall-clock time in a zone.

```railroad
dt-fromZone
```

## Signature

```typescript
expr.dt.fromZone(zone: ExprLike, options?: { ambiguous?: 'earliest' | 'latest' | 'raise' }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `zone` | `ExprLike` | An IANA name, `UTC` or an offset: a value, or a column of them. |
| `ambiguous` | `string` | A time that occurs twice (clocks going back): the `earliest` (default) or `latest` instant, or an error with `raise`. |

## Returns

A `datetime`: the UTC instant. A time that doesn't occur (clocks going forward) moves forward by the gap.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime`. |
| `SMALT_MISMATCH` | The zone isn't a time zone, or the time is ambiguous with `ambiguous: 'raise'`. |

## Examples

Paris wall-clock times as UTC:

```ts
const local = frame({ at: ['2026-07-01 14:00:00', '2026-10-25 02:30:00'] }).select(col('at').str.toDatetime());
local.select('at', col('at').dt.fromZone('Europe/Paris').alias('earliest'), col('at').dt.fromZone('Europe/Paris', { ambiguous: 'latest' }).alias('latest'));
```

| at | earliest | latest |
| --- | --- | --- |
| 2026-07-01 14:00:00 | 2026-07-01 12:00:00 | 2026-07-01 12:00:00 |
| 2026-10-25 02:30:00 | 2026-10-25 00:30:00 | 2026-10-25 01:30:00 |

## Demo

Meeting times entered in New York, stored in UTC:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ start: ['2026-11-09 09:00:00'] }).select(col('start').str.toDatetime().dt.fromZone('America/New_York').alias('utc'));
```

| utc |
| --- |
| 2026-11-09 14:00:00 |

## See also

[`dt.toZone`](./toZone), [`dt.zoneOffset`](./zoneOffset)
