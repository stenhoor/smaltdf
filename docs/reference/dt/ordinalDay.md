# `dt.ordinalDay`

The day of the year, from 1.

```railroad
dt-ordinalDay
```

## Signature

```typescript
expr.dt.ordinalDay(): Expr
```

## Returns

An `int` from 1 to 366.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `date` or `datetime`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.ordinalDay().alias('ordinalDay'));
```

| at | ordinalDay |
| --- | --- |
| 2026-11-07 13:04:05.678 | 311 |
| 2024-02-29 23:59:59 | 60 |
| null | null |

## Demo

Days into the year:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ day: ['2026-01-01', '2026-12-31', '2024-12-31'] }).select('day', col('day').cast('date').dt.ordinalDay().alias('n'));
```

| day | n |
| --- | --- |
| 2026-01-01 | 1 |
| 2026-12-31 | 365 |
| 2024-12-31 | 366 |

## See also

[`dt.year`](./year), [`dt.month`](./month), [`dt.day`](./day), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
