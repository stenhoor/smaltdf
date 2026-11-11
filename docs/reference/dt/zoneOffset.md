# `dt.zoneOffset`

A zone's offset from UTC at a UTC instant.

```railroad
dt-zoneOffset
```

## Signature

```typescript
expr.dt.zoneOffset(zone: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `zone` | `ExprLike` | An IANA name, `UTC` or an offset: a value, or a column of them. |

## Returns

A `duration`: positive east of UTC.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime`. |
| `SMALT_MISMATCH` | The zone isn't a time zone. |

## Examples

Summer and winter in Paris:

```ts
const instants = frame({ at: [new Date('2026-01-15T12:00:00Z'), new Date('2026-07-15T12:00:00Z')] });
instants.select('at', col('at').dt.zoneOffset('Europe/Paris').alias('offset'));
```

| at | offset |
| --- | --- |
| 2026-01-15 12:00:00 | PT1H |
| 2026-07-15 12:00:00 | PT2H |

## Demo

The offset of each office's zone at one instant:

```ts
import { col, frame, lit } from '@smaltworks/smaltdf';

const offices = frame({ city: ['Kolkata', 'Los Angeles'], tz: ['Asia/Kolkata', 'America/Los_Angeles'] });
offices.select('city', lit(new Date('2026-11-07T12:00:00Z')).dt.zoneOffset(col('tz')).alias('offset'));
```

| city | offset |
| --- | --- |
| Kolkata | PT5H30M |
| Los Angeles | -PT8H |

## See also

[`dt.toZone`](./toZone), [`dt.fromZone`](./fromZone)
