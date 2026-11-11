# `cumMax`

The largest non-null value so far.

```railroad
cumMax
```

## Signature

```typescript
expr.cumMax(): Expr
```

## Returns

Of the column's type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The column's type doesn't fit, or it is used in `agg`. |

## Notes

- A null value gives null on its own row and doesn't change the running value.

## Examples

Over all rows, in the frame's order:

```ts
const sales = frame({ shop: ['a', 'b', 'a', 'a', 'b'], t: [1, 1, 2, 3, 2], amt: [10, 4, null, 7, 6] });
sales.select('t', 'amt', col('amt').cumMax().alias('cumMax'));
```

| t | amt | cumMax |
| --- | --- | --- |
| 1 | 10 | 10 |
| 1 | 4 | 10 |
| 2 | null | null |
| 3 | 7 | 10 |
| 2 | 6 | 10 |

Per shop, in time order:

```ts
sales.withColumns(col('amt').cumMax().over('shop', { orderBy: 't' }).alias('cumMax')).sort(['shop', 't']);
```

| shop | t | amt | cumMax |
| --- | --- | --- | --- |
| a | 1 | 10 | 10 |
| a | 2 | null | null |
| a | 3 | 7 | 10 |
| b | 1 | 4 | 4 |
| b | 2 | 6 | 6 |

## Demo

The record so far:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ year: [2021, 2022, 2023, 2024], km: [40, 52, 47, 60] }).withColumns(col('km').cumMax().alias('record'));
```

| year | km | record |
| --- | --- | --- |
| 2021 | 40 | 40 |
| 2022 | 52 | 52 |
| 2023 | 47 | 52 |
| 2024 | 60 | 60 |

## See also

[`over`](./over), [`cumSum`](./cumSum), [`cumMin`](./cumMin), [`cumCount`](./cumCount), [`shift`](./shift)
