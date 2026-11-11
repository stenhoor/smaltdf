# Dates and times (dt)

The methods of `expr.dt` work on the four types that hold dates and times, to the µs:

| Type | Holds | `collect` gives |
| --- | --- | --- |
| `date` | a calendar date | text, `2026-11-07` |
| `datetime` | a date and time of day, with no zone | a JS `Date` |
| `time` | a time of day | text, `13:04:05.678` |
| `duration` | a span of time | ISO 8601 text, `P1DT2H30M` |

A null value gives null.

```ts
import { col } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Parts of a date

- [`dt.year`](./year): The year.
- [`dt.month`](./month): The month, from 1 (January) to 12.
- [`dt.day`](./day): The day of the month, from 1.
- [`dt.weekday`](./weekday): The ISO weekday: Monday is 1, Sunday 7.
- [`dt.ordinalDay`](./ordinalDay): The day of the year, from 1.

### Parts of a time

- [`dt.hour`](./hour): The hour, from 0 to 23.
- [`dt.minute`](./minute): The minute, from 0 to 59.
- [`dt.second`](./second): The second, from 0 to 59, without its fraction.
- [`dt.microsecond`](./microsecond): The µs within the second, from 0 to 999999.

### Changing

- [`dt.date`](./date): The date of a `datetime`.
- [`dt.truncate`](./truncate): The start of the period that holds the value: its year, quarter, month, week, day, hour and so on.
- [`dt.offsetBy`](./offsetBy): The value moved by a span of calendar time, or by a `duration`.
- [`dt.strftime`](./strftime): The value written as text with a `strftime` format.

### Time zones

- [`dt.toZone`](./toZone): The wall-clock time in a zone of a UTC instant.
- [`dt.fromZone`](./fromZone): The UTC instant of a wall-clock time in a zone.
- [`dt.zoneOffset`](./zoneOffset): A zone's offset from UTC at a UTC instant.

## Rules they share

- **Zones:** a `datetime` carries no zone: the data says whether it is a UTC instant or a wall-clock time. A zone is an
  IANA name (`Europe/Paris`), `UTC` or an offset (`+05:30`), and any expression, so a column of zones gives each row
  its own.
- **Arithmetic:** `datetime - datetime`, `date - date` and `time - time` are `duration`s; a date or time plus or minus
  a `duration` moves it ([`add`](../expressions/add), [`sub`](../expressions/sub)). Move a `date` by months with
  [`offsetBy`](./offsetBy).
- **Parts** are `int`s; a part a type doesn't have (the hour of a `date`) is an error when the plan is built.
