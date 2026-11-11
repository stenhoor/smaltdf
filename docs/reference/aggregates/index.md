# Aggregates

An aggregate gives one value from many rows. It is used in three places:

- in `groupBy(…).agg(…)`, once per group;
- in a `select` whose columns are all aggregates, once over every row;
- with [`over`](../windows/over), once per partition, on every row.

Anywhere else (`filter`, `withColumns` without `over`) an aggregate is an error.

```ts
import { col, len } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Counting

- [`len`](./len): The number of rows, nulls included. A function: `len()`.
- [`count`](./count): The number of non-null values.

### Sums and averages

- [`sum`](./sum): The sum of the non-null values; 0 when there are none.
- [`mean`](./mean): The mean of the non-null values; null when there are none.
- [`median`](./median): The median of the non-null values; null when there are none.

### Spread

- [`std`](./std): The sample standard deviation of the non-null values.
- [`var`](./var): The sample variance of the non-null values.

### Extremes

- [`min`](./min): The smallest non-null value; null when there are none.
- [`max`](./max): The largest non-null value; null when there are none.

### By position

- [`first`](./first): The value of the first row, in the group's order.
- [`last`](./last): The value of the last row, in the group's order.

### Collecting

- [`implode`](./implode): The group's values as a list, in the group's order, nulls included.

## Rules they share

- **Nulls are skipped:** an aggregate reads the non-null values, except `len()` (rows), `first` / `last` (the row's
  value, null or not) and `implode` (nulls kept).
- **No values:** `sum` and `count` of no values are 0; `mean`, `min`, `max`, `median`, `std` and `var` are null.
- **Names:** an aggregate is named after its column (`col('qty').sum()` is `qty`); `len()` is `len`.
- **Expressions of aggregates:** `col('qty').sum().div(len())` combines aggregates, and in `agg` the keys can join in:
  `col('region').str.upper()`.
