# `dt.day`

The day of the month, from 1.

```railroad
dt-day
```

## Signature

```typescript
expr.dt.day(): Expr
```

## Returns

An `int` from 1 to 31.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `date` or `datetime`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.day().alias('day'));
```

| at | day |
| --- | --- |
| 2026-11-07 13:04:05.678 | 7 |
| 2024-02-29 23:59:59 | 29 |
| null | null |

## Demo

Paydays on the 25th:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ paid: ['2026-01-25', '2026-02-24', '2026-03-25'] }).filter(col('paid').cast('date').dt.day().eq(25));
```

| paid |
| --- |
| 2026-01-25 |
| 2026-03-25 |

## See also

[`dt.year`](./year), [`dt.month`](./month), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
