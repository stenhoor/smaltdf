# Windows

A window computes a value for every row from the rows around it: a running total, the previous value, a rank, a
group's total. It never moves rows: the result has the frame's rows, in the frame's order.

```ts
import { col, frame } from '@smaltworks/smaltdf';

const sales = frame({
  shop: ['a', 'b', 'a', 'a', 'b'],
  day: [1, 1, 2, 3, 2],
  amt: [10, 4, 8, 7, 6],
});
sales.withColumns(
  col('amt').sum().over('shop').alias('shop_total'),
  col('amt').cumSum().over('shop', { orderBy: 'day' }).alias('running'),
  col('amt').shift().over('shop', { orderBy: 'day' }).alias('prev'),
  col('amt').rank({ descending: true }).over('shop').alias('rank'),
);
```

| shop | day | amt | shop_total | running | prev | rank |
| --- | --- | --- | --- | --- | --- | --- |
| a | 1 | 10 | 25 | 10 | null | 1 |
| b | 1 | 4 | 10 | 4 | null | 2 |
| a | 2 | 8 | 25 | 18 | 10 | 2 |
| a | 3 | 7 | 25 | 25 | 8 | 3 |
| b | 2 | 6 | 10 | 10 | 4 | 1 |

## Partitions and order

[`over(partitionBy, { orderBy })`](../reference/windows/over) computes the function per partition: the rows with equal
`partitionBy` values (with none, all rows are one partition). `orderBy` orders each partition for the functions that
follow an order: running values, `shift`, `first` and `last`. Without it they follow the frame's order.

| Function | Gives |
| --- | --- |
| an aggregate, `.over(…)` | The aggregate of the row's whole partition |
| [`cumSum`](../reference/windows/cumSum), [`cumMin`](../reference/windows/cumMin), [`cumMax`](../reference/windows/cumMax), [`cumCount`](../reference/windows/cumCount) | The running value so far |
| [`shift(n, fill)`](../reference/windows/shift) | The value `n` rows earlier, or later for a negative `n` |
| [`rank({ method })`](../reference/windows/rank) | The value's rank: `min`, `dense` or `ordinal` |

## Filtering with a window

A window can filter: here the best day of each shop.

```ts
sales.filter(col('amt').rank({ method: 'ordinal', descending: true }).over('shop').eq(1));
```

| shop | day | amt |
| --- | --- | --- |
| a | 1 | 10 |
| b | 2 | 6 |

## Without `over`

A window function without `over` works on all rows in the frame's order:

```ts
sales.sort('day').select('day', 'amt', col('amt').cumSum().alias('running'));
```

| day | amt | running |
| --- | --- | --- |
| 1 | 10 | 10 |
| 1 | 4 | 14 |
| 2 | 8 | 22 |
| 2 | 6 | 28 |
| 3 | 7 | 35 |

An aggregate needs `over` outside `agg` and a select of aggregates. Windows with the same partition and order are
computed together; when one orders, the rows are numbered first and put back in place after, so the frame keeps its
order.
