# `dt.hour`

The hour, from 0 to 23.

```railroad
dt-hour
```

## Signature

```typescript
expr.dt.hour(): Expr
```

## Returns

An `int` from 0 to 23.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime` or `time`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.hour().alias('hour'));
```

| at | hour |
| --- | --- |
| 2026-11-07 13:04:05.678 | 13 |
| 2024-02-29 23:59:59 | 23 |
| null | null |

## Demo

Visits per hour:

```ts
import { col, frame, len } from '@smaltworks/smaltdf';

frame({ at: [new Date('2026-11-07T09:15:00Z'), new Date('2026-11-07T09:50:00Z'), new Date('2026-11-07T14:05:00Z')] }).groupBy(col('at').dt.hour().alias('hour'), { maintainOrder: true }).agg(len());
```

| hour | len |
| --- | --- |
| 9 | 2 |
| 14 | 1 |

## See also

[`dt.year`](./year), [`dt.month`](./month), [`dt.day`](./day), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
