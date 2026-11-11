# `dt.weekday`

The ISO weekday: Monday is 1, Sunday 7.

```railroad
dt-weekday
```

## Signature

```typescript
expr.dt.weekday(): Expr
```

## Returns

An `int` from 1 to 7.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `date` or `datetime`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.weekday().alias('weekday'));
```

| at | weekday |
| --- | --- |
| 2026-11-07 13:04:05.678 | 6 |
| 2024-02-29 23:59:59 | 4 |
| null | null |

## Demo

Weekend days:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ day: ['2026-11-06', '2026-11-07', '2026-11-08'] }).withColumns(col('day').cast('date').dt.weekday().ge(6).alias('weekend'));
```

| day | weekend |
| --- | --- |
| 2026-11-06 | false |
| 2026-11-07 | true |
| 2026-11-08 | true |

## See also

[`dt.year`](./year), [`dt.month`](./month), [`dt.day`](./day), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
