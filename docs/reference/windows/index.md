# Windows

A window computes a value for every row from the rows around it, and never moves rows: the result has the frame's
rows, in the frame's order. Windows are used in `select`, `withColumns` and `filter`.

```ts
import { col } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Partitions

- [`over`](./over): An aggregate or window function computed per partition, on every row.

### Running values

- [`cumSum`](./cumSum): The running sum of the non-null values so far.
- [`cumMin`](./cumMin): The smallest non-null value so far.
- [`cumMax`](./cumMax): The largest non-null value so far.
- [`cumCount`](./cumCount): The number of non-null values so far.

### Position

- [`shift`](./shift): The value `n` rows earlier (later for a negative `n`), or `fill` where there is none.
- [`rank`](./rank): The value's rank among the values of its partition.

## Rules they share

- **Partitions:** [`over(partitionBy, { orderBy })`](./over) computes per partition: the rows with equal
  `partitionBy` values (none: all rows). `orderBy` orders each partition for the functions that follow an order;
  without it they follow the frame's order.
- **Without `over`**, a window function works on all rows in the frame's order. An aggregate needs `over` outside
  `agg` and a select of aggregates.
- **Cost:** windows with the same partition and order are computed together.
