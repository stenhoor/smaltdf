# `dt.toZone`

The wall-clock time in a zone of a UTC instant.

```railroad
dt-toZone
```

## Signature

```typescript
expr.dt.toZone(zone: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `zone` | `ExprLike` | An IANA name (`Europe/Paris`), `UTC` or an offset (`+05:30`): a value, or a column of them. |

## Returns

A `datetime`: the local time, with no zone.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime`, or the zone isn't text. |
| `SMALT_MISMATCH` | The zone isn't a time zone. |

## Notes

- A `datetime` doesn't remember its zone: `toZone` gives the clock time, and `fromZone` goes back.

## Examples

One instant in three zones:

```ts
const utc = frame({ at: [new Date('2026-07-01T12:00:00Z')] });
utc.select(col('at').dt.toZone('Europe/Paris').alias('paris'), col('at').dt.toZone('America/New_York').alias('new_york'), col('at').dt.toZone('+05:30').alias('india'));
```

| paris | new_york | india |
| --- | --- | --- |
| 2026-07-01 14:00:00 | 2026-07-01 08:00:00 | 2026-07-01 17:30:00 |

A zone per row:

```ts
frame({ at: [new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z')], tz: ['Asia/Tokyo', 'UTC'] }).select('tz', col('at').dt.toZone(col('tz')).alias('local'));
```

| tz | local |
| --- | --- |
| Asia/Tokyo | 2026-01-01 09:00:00 |
| UTC | 2026-01-01 00:00:00 |

## Demo

Local hours of UTC log times:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ at: [new Date('2026-11-07T08:30:00Z')] }).select(col('at').dt.toZone('Australia/Sydney').dt.hour().alias('sydney_hour'));
```

| sydney_hour |
| --- |
| 19 |

## See also

[`dt.fromZone`](./fromZone), [`dt.zoneOffset`](./zoneOffset)
