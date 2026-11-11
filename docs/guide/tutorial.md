# Tutorial

A small shop's sales, from raw data to a report, one step at a time. Each step runs on this page: press **Run** under
an example to run it (and the steps above it) in your browser, or **Edit** to change it first.

## 1. Data in a table

Start with data from JavaScript, and keep it in a table so later frames can read it by name.

```ts
import { col, frame, len, table } from '@smaltworks/smaltdf';

await frame({
  id: [1, 2, 3, 4, 5, 6, 7, 8],
  day: ['2026-11-02', '2026-11-02', '2026-11-03', '2026-11-03', '2026-11-04', '2026-11-04', '2026-11-04', '2026-11-05'],
  product: ['tea', 'cake', 'tea', 'jam', 'tea', 'cake', 'cake', 'jam'],
  qty: [2, 1, 4, 1, 3, 2, 1, null],
  price: [4.5, 3.25, 4.5, 6, 4.5, 3.25, 3.25, 6],
}).createTable(db, 'sales');
table('sales').head(3);
```

| id | day | product | qty | price |
| --- | --- | --- | --- | --- |
| 1 | 2026-11-02 | tea | 2 | 4.5 |
| 2 | 2026-11-02 | cake | 1 | 3.25 |
| 3 | 2026-11-03 | tea | 4 | 4.5 |

`createTable` writes the rows and resolves to the number written. `table('sales')` reads them back; `head(3)` shows the
first three.

## 2. Columns that compute

A frame describes a computation. `withColumns` adds columns made of expressions: here the total of each sale, and the
day read as a `date`.

```ts
const sales = table('sales').withColumns(
  col('qty').mul(col('price')).alias('total'),
  col('day').str.toDate(),
);
sales.head(3);
```

| id | day | product | qty | price | total |
| --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-02 | tea | 2 | 4.5 | 9 |
| 2 | 2026-11-02 | cake | 1 | 3.25 | 3.25 |
| 3 | 2026-11-03 | tea | 4 | 4.5 | 18 |

Nothing has run yet when `sales` is built: it runs when a frame that uses it is collected (here, by the playground).

## 3. Rows that matter

`filter` keeps the rows where a condition is true. Sale 8 has no quantity, so its total is null, and a null condition
drops the row.

```ts
sales.filter(col('total').ge(9)).select('id', 'product', 'total');
```

| id | product | total |
| --- | --- | --- |
| 1 | tea | 9 |
| 3 | tea | 18 |
| 5 | tea | 13.5 |

## 4. A summary

`groupBy(…).agg(…)` gives one row per product. `sum` skips nulls, and `len()` counts rows.

```ts
const perProduct = sales
  .groupBy('product', { maintainOrder: true })
  .agg(len().alias('sales'), col('qty').sum().alias('units'), col('total').sum().alias('revenue'));
perProduct.sort('revenue', { descending: true });
```

| product | sales | units | revenue |
| --- | --- | --- | --- |
| tea | 3 | 9 | 40.5 |
| cake | 3 | 4 | 13 |
| jam | 2 | 1 | 6 |

## 5. Each day against the best day

A window computes a value for every row from the rows around it. Here each day's revenue, with the best day's beside it.

```ts
sales
  .groupBy('day', { maintainOrder: true })
  .agg(col('total').sum().alias('revenue'))
  .withColumns(col('revenue').max().over().alias('best'), col('revenue').cumSum().over([], { orderBy: 'day' }).alias('so_far'));
```

| day | revenue | best | so_far |
| --- | --- | --- | --- |
| 2026-11-02 | 12.25 | 24 | 12.25 |
| 2026-11-03 | 24 | 24 | 36.25 |
| 2026-11-04 | 23.25 | 24 | 59.5 |
| 2026-11-05 | 0 | 24 | 59.5 |

## 6. Kept as a view

A view stores the frame by name. It reads as a table, and its rows follow the table it reads.

```ts
await perProduct.createView(db, 'per_product');
await frame({ id: [9], day: ['2026-11-05'], product: ['jam'], qty: [5], price: [6] }).insertInto(db, 'sales');
table('per_product').filter(col('product').eq('jam'));
```

| product | sales | units | revenue |
| --- | --- | --- | --- |
| jam | 3 | 6 | 36 |

## Next

- [Frames and expressions](./frames): how frames, expressions and plans fit together.
- [Aggregation](./aggregation), [Joins](./joins), [Windows](./windows): the tasks above, in depth.
- [Reference](../reference/): every method, each with examples to run.
