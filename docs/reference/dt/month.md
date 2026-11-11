# `dt.month`

The month, from 1 (January) to 12.

```railroad
dt-month
```

## Signature

```typescript
expr.dt.month(): Expr
```

## Returns

An `int` from 1 to 12.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `date` or `datetime`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.month().alias('month'));
```

| at | month |
| --- | --- |
| 2026-11-07 13:04:05.678 | 11 |
| 2024-02-29 23:59:59 | 2 |
| null | null |

## Demo

The month of each date:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ day: ['2026-01-31', '2026-07-04'] }).select('day', col('day').cast('date').dt.month().alias('month'));
```

| day | month |
| --- | --- |
| 2026-01-31 | 1 |
| 2026-07-04 | 7 |

## See also

[`dt.year`](./year), [`dt.day`](./day), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
