# `dt.year`

The year.

```railroad
dt-year
```

## Signature

```typescript
expr.dt.year(): Expr
```

## Returns

An `int`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `date` or `datetime`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.year().alias('year'));
```

| at | year |
| --- | --- |
| 2026-11-07 13:04:05.678 | 2026 |
| 2024-02-29 23:59:59 | 2024 |
| null | null |

## Demo

Orders per year:

```ts
import { col, frame, len } from '@smaltworks/smaltdf';

frame({ day: ['2025-12-30', '2026-01-02', '2026-03-09'] }).groupBy(col('day').cast('date').dt.year().alias('year'), { maintainOrder: true }).agg(len());
```

| year | len |
| --- | --- |
| 2025 | 1 |
| 2026 | 2 |

## See also

[`dt.month`](./month), [`dt.day`](./day), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
