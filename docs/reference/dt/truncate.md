# `dt.truncate`

The start of the period that holds the value: its year, quarter, month, week, day, hour and so on.

```railroad
dt-truncate
```

## Signature

```typescript
expr.dt.truncate(every: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `every` | `string` | The period: `1y`, `1q`, `1mo`, `1w` (weeks start on Monday), `1d`, `1h`, `1m`, `1s`, `1ms` or `1us`. |

## Returns

Of the value's type: a `date` or `datetime` at the start of its period.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `date` or `datetime`. |
| `SMALTDF_RANGE` | `every` isn't one of the periods. |

## Examples

A datetime truncated to several periods:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.filter(col('at').isNotNull()).select(col('at').dt.truncate('1mo').alias('month'), col('at').dt.truncate('1w').alias('week'), col('at').dt.truncate('1h').alias('hour'));
```

| month | week | hour |
| --- | --- | --- |
| 2026-11-01 00:00:00 | 2026-11-02 00:00:00 | 2026-11-07 13:00:00 |
| 2024-02-01 00:00:00 | 2024-02-26 00:00:00 | 2024-02-29 23:00:00 |

A period it doesn't know:

<!-- docs:error SMALTDF_RANGE -->
```ts
events.select(col('at').dt.truncate('2d'));
```

## Demo

Totals per month:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const spend = frame({ day: ['2026-01-05', '2026-01-20', '2026-02-02'], eur: [30, 12, 50] });
spend.groupBy(col('day').cast('date').dt.truncate('1mo').alias('month'), { maintainOrder: true }).agg(col('eur').sum());
```

| month | eur |
| --- | --- |
| 2026-01-01 | 42 |
| 2026-02-01 | 50 |

## See also

[`dt.date`](./date), [`dt.offsetBy`](./offsetBy), [`groupBy`](../frames/groupBy)
