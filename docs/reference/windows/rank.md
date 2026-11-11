# `rank`

The value's rank among the values of its partition.

```railroad
rank
```

## Signature

```typescript
expr.rank(options?: { method?: 'min' | 'dense' | 'ordinal'; descending?: boolean }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `method` | `string` | `min` (default): ties share the lowest rank, with gaps after; `dense`: ranks without gaps; `ordinal`: ties ranked by order, 1, 2, 3. |
| `descending` | `boolean` | Rank the largest first. Default `false`. |

## Returns

An `int` from 1. A null value ranks null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | It gets an `orderBy` in `over` (it orders by its own value), or it is used in `agg`. |

## Notes

- Polars' default method is `average`, a real; smaltdf's is `min`, an integer: see [Compared with Polars](../../guide/polars).

## Examples

The three methods:

```ts
const points = frame({ name: ['a', 'b', 'c', 'd', 'e'], pts: [30, 45, 30, 12, null] });
points.select('name', 'pts', col('pts').rank({ descending: true }).alias('min'), col('pts').rank({ method: 'dense', descending: true }).alias('dense'), col('pts').rank({ method: 'ordinal', descending: true }).alias('ordinal'));
```

| name | pts | min | dense | ordinal |
| --- | --- | --- | --- | --- |
| a | 30 | 2 | 2 | 2 |
| b | 45 | 1 | 1 | 1 |
| c | 30 | 2 | 2 | 3 |
| d | 12 | 4 | 3 | 4 |
| e | null | null | null | null |

## Demo

Places per group:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const race = frame({ cls: ['m', 'm', 'w', 'w'], time: [61, 58, 64, 66] });
race.withColumns(col('time').rank().over('cls').alias('place'));
```

| cls | time | place |
| --- | --- | --- |
| m | 61 | 2 |
| m | 58 | 1 |
| w | 64 | 1 |
| w | 66 | 2 |

## See also

[`over`](./over), [`sort`](../frames/sort), [`head`](../frames/head)
