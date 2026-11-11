# `dt.date`

The date of a `datetime`.

```railroad
dt-date
```

## Signature

```typescript
expr.dt.date(): Expr
```

## Returns

A `date`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime` or `date`. |

## Examples

The day of each moment:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.date().alias('date'));
```

| at | date |
| --- | --- |
| 2026-11-07 13:04:05.678 | 2026-11-07 |
| 2024-02-29 23:59:59 | 2024-02-29 |
| null | null |

## Demo

Sales per day from timestamps:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const sold = frame({ at: [new Date('2026-11-07T09:00:00Z'), new Date('2026-11-07T18:00:00Z'), new Date('2026-11-08T10:00:00Z')], eur: [5, 7, 3] });
sold.groupBy(col('at').dt.date().alias('day'), { maintainOrder: true }).agg(col('eur').sum());
```

| day | eur |
| --- | --- |
| 2026-11-07 | 12 |
| 2026-11-08 | 3 |

## See also

[`dt.truncate`](./truncate), [`cast`](../expressions/cast)
