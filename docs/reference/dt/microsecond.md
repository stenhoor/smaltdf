# `dt.microsecond`

The µs within the second, from 0 to 999999.

```railroad
dt-microsecond
```

## Signature

```typescript
expr.dt.microsecond(): Expr
```

## Returns

An `int` from 0 to 999999.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime` or `time`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.microsecond().alias('microsecond'));
```

| at | microsecond |
| --- | --- |
| 2026-11-07 13:04:05.678 | 678000 |
| 2024-02-29 23:59:59 | 0 |
| null | null |

## Demo

The fraction of a second, in µs:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ at: [new Date('2026-11-07T09:15:42.25Z')] }).select(col('at').dt.microsecond());
```

| at |
| --- |
| 250000 |

## See also

[`dt.year`](./year), [`dt.month`](./month), [`dt.day`](./day), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
