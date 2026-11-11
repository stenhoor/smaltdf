# `dt.second`

The second, from 0 to 59, without its fraction.

```railroad
dt-second
```

## Signature

```typescript
expr.dt.second(): Expr
```

## Returns

An `int` from 0 to 59.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `datetime` or `time`. |

## Examples

Of each datetime:

```ts
const events = frame({ at: [new Date('2026-11-07T13:04:05.678Z'), new Date('2024-02-29T23:59:59Z'), null] });
events.select('at', col('at').dt.second().alias('second'));
```

| at | second |
| --- | --- |
| 2026-11-07 13:04:05.678 | 5 |
| 2024-02-29 23:59:59 | 59 |
| null | null |

## Demo

Whole seconds:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ at: [new Date('2026-11-07T09:15:42.5Z')] }).select(col('at').dt.second());
```

| at |
| --- |
| 42 |

## See also

[`dt.year`](./year), [`dt.month`](./month), [`dt.day`](./day), [`dt.hour`](./hour), [`dt.truncate`](./truncate), [`Dates and times`](../../guide/dates-and-times)
