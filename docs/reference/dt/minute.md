# `dt.minute`

The minute, from 0 to 59.

```railroad
dt-minute
```

## Signature

```typescript
expr.dt.minute(): Expr
```

## Returns

An `int` from 0 to 59.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime` or `time`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.minute().alias('minute'));
```

| at | minute |
| --- | --- |
| 2026-11-07 13:04:05.678 | 4 |
| 2024-02-29 23:59:59 | 59 |
| null | null |

## Demo

The minute past the hour:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ at: [new Date('2026-11-07T09:15:00Z')] }).select(col('at').dt.minute());
```

| at |
| --- |
| 15 |

## See also

[`dt.year`](./year), [`dt.month`](./month), [`dt.day`](./day), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
