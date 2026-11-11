# `shift`

The value `n` rows earlier (later for a negative `n`), or `fill` where there is none.

```railroad
shift
```

## Signature

```typescript
expr.shift(n?: number, fill?: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | How many rows back: a whole number. Negative looks ahead. Default 1. |
| `fill` | `ExprLike` | The value where no row is that far away. Default `null`. |

## Returns

Of the column's type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | `fill` doesn't fit the column's type, or it is used in `agg`. |

## Examples

The previous and the next value:

```ts
const sales = frame({ shop: ['a', 'b', 'a', 'a', 'b'], t: [1, 1, 2, 3, 2], amt: [10, 4, null, 7, 6] });
sales.select('t', 'amt', col('amt').shift().alias('prev'), col('amt').shift(-1, 0).alias('next'));
```

| t | amt | prev | next |
| --- | --- | --- | --- |
| 1 | 10 | null | 4 |
| 1 | 4 | 10 | null |
| 2 | null | 4 | 7 |
| 3 | 7 | null | 6 |
| 2 | 6 | 7 | 0 |

Per shop, in time order:

```ts
sales.withColumns(col('amt').shift().over('shop', { orderBy: 't' }).alias('prev')).sort(['shop', 't']);
```

| shop | t | amt | prev |
| --- | --- | --- | --- |
| a | 1 | 10 | null |
| a | 2 | null | 10 |
| a | 3 | 7 | null |
| b | 1 | 4 | null |
| b | 2 | 6 | 4 |

## Demo

Change from the day before:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ day: [1, 2, 3], visits: [120, 150, 135] }).withColumns(col('visits').sub(col('visits').shift()).alias('change'));
```

| day | visits | change |
| --- | --- | --- |
| 1 | 120 | null |
| 2 | 150 | 30 |
| 3 | 135 | -15 |

## See also

[`over`](./over), [`cumSum`](./cumSum)
