# Aggregation

An aggregate gives one value from many rows: a sum, a count, a mean. smaltdf computes them per group, over every row,
or per row with a window.

```ts
import { col, frame, len } from '@smaltworks/smaltdf';

const orders = frame({
  region: ['n', 's', 'n', 'e', 's', 'n'],
  qty: [3, 12, 7, null, 5, 1],
  price: [2.5, 1, 4, 3, 2, 2.5],
});
orders.groupBy('region', { maintainOrder: true }).agg(len(), col('qty').sum(), col('price').mean().alias('avg_price'));
```

| region | len | qty | avg_price |
| --- | --- | --- | --- |
| n | 3 | 11 | 3 |
| s | 2 | 17 | 1.5 |
| e | 1 | 0 | 3 |

## Per group

[`groupBy(…keys).agg(…)`](../reference/frames/groupBy) gives one row per distinct key: the keys first, then one column
per aggregate. Groups come in no particular order unless `maintainOrder: true`, which gives them in order of each
group's first row.

A key can be an expression, and an `agg` column can combine aggregates and keys:

```ts
orders
  .groupBy(col('price').ge(3).alias('dear'), { maintainOrder: true })
  .agg(col('qty').sum().div(len()).round(1).alias('qty_per_order'));
```

| dear | qty_per_order |
| --- | --- |
| false | 5.2 |
| true | 3.5 |

In `agg`, a column outside an aggregate must be a key: a group has many values of any other column.

## Over every row

A `select` whose columns are all aggregates gives one row over every row:

```ts
orders.select(len().alias('orders'), col('qty').sum(), col('qty').count().alias('with_qty'), col('price').max());
```

| orders | qty | with_qty | price |
| --- | --- | --- | --- |
| 6 | 28 | 5 | 4 |

## Nulls and no values

Aggregates skip nulls: `count` counts the non-null values and `len()` the rows. Over no values, `sum` and `count` are 0
and the others are null. Region `e` above has one order with no quantity, so its `qty` sum is 0.

## Per row, with a window

An aggregate with [`over`](../reference/windows/over) is computed per partition and given to each of its rows. The
frame keeps its rows:

```ts
orders.withColumns(col('qty').sum().over('region').alias('region_qty'));
```

| region | qty | price | region_qty |
| --- | --- | --- | --- |
| n | 3 | 2.5 | 11 |
| s | 12 | 1 | 17 |
| n | 7 | 4 | 11 |
| e | null | 3 | 0 |
| s | 5 | 2 | 17 |
| n | 1 | 2.5 | 11 |

## Distinct rows

[`unique`](../reference/frames/unique) keeps one row per distinct value of some columns, the first or the last of each.

The [aggregates reference](../reference/aggregates/) lists every aggregate.
