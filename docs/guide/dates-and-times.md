# Dates and times

Four types hold dates and times, to the µs:

| Type | Holds | `collect` gives |
| --- | --- | --- |
| `date` | a calendar date | text, `2026-11-07` |
| `datetime` | a date and time of day, with no zone | a JS `Date` |
| `time` | a time of day | text, `13:04:05.678` |
| `duration` | a span of time | ISO 8601 text, `P1DT2H30M` |

A column of JS `Date`s is a `datetime`. Text becomes a date or time with
[`str.toDate`](../reference/str/toDate), [`str.toDatetime`](../reference/str/toDatetime) or
[`cast`](../reference/expressions/cast).

```ts
import { col, frame } from '@smaltworks/smaltdf';

const trips = frame({
  start: [new Date('2026-11-07T08:15:00Z'), new Date('2026-11-07T17:40:00Z')],
  end: [new Date('2026-11-07T09:05:30Z'), new Date('2026-11-07T18:00:00Z')],
  booked: ['2026-10-31', '2026-11-06'],
});
trips.select(
  col('start').dt.hour().alias('hour'),
  col('end').sub(col('start')).alias('took'),
  col('booked').str.toDate().dt.weekday().alias('booked_weekday'),
);
```

| hour | took | booked_weekday |
| --- | --- | --- |
| 8 | PT50M30S | 6 |
| 17 | PT20M | 5 |

## Parts, periods and moves

- **Parts:** [`year`](../reference/dt/year), [`month`](../reference/dt/month), [`day`](../reference/dt/day),
  [`weekday`](../reference/dt/weekday), [`hour`](../reference/dt/hour) and the rest give `int`s.
- **Periods:** [`truncate`](../reference/dt/truncate) gives the start of a year, month, week (Monday) or day; it is how
  to group by month.
- **Moves:** [`offsetBy`](../reference/dt/offsetBy) moves by calendar time (`1mo`, `-2d`); a month later than January
  31 is the last day of February.
- **Text:** [`strftime`](../reference/dt/strftime) writes a date with a format.

```ts
const spend = frame({ day: ['2026-01-05', '2026-01-20', '2026-02-02'], eur: [30, 12, 50] }).select(col('day').str.toDate(), 'eur');
spend.groupBy(col('day').dt.truncate('1mo').alias('month'), { maintainOrder: true }).agg(col('eur').sum());
```

| month | eur |
| --- | --- |
| 2026-01-01 | 42 |
| 2026-02-01 | 50 |

## Arithmetic

`datetime - datetime`, `date - date` and `time - time` are `duration`s. A date or time plus or minus a `duration` is
moved by it. Durations add, multiply by an `int`, and `sum`. Other arithmetic on dates and times is an error.

## Comparing with text

Text compared with a `date` or `datetime` is read as one, so a filter can use a literal date:

```ts
spend.filter(col('day').ge('2026-01-15'));
```

| day | eur |
| --- | --- |
| 2026-01-20 | 12 |
| 2026-02-02 | 50 |

## Time zones

A `datetime` carries no zone: the data says whether it is a UTC instant or a wall-clock time.
[`toZone`](../reference/dt/toZone) gives the wall-clock time in a zone of a UTC instant, and
[`fromZone`](../reference/dt/fromZone) the UTC instant of a wall-clock time. A zone is an IANA name, `UTC` or an offset,
and can be a column, so each row can have its own.

```ts
const meetings = frame({ at: [new Date('2026-07-01T12:00:00Z'), new Date('2026-07-01T12:00:00Z')], tz: ['Europe/Paris', 'Asia/Tokyo'] });
meetings.select('tz', col('at').dt.toZone(col('tz')).alias('local'));
```

| tz | local |
| --- | --- |
| Europe/Paris | 2026-07-01 14:00:00 |
| Asia/Tokyo | 2026-07-01 21:00:00 |

Zones come from the browser's or Node's time zone data (`Intl`).
