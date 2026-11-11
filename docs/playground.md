# Playground

smaltdf running in your browser, on small sample data: the frames below are made before every run. Change the query
and press **Run** (or Ctrl+Enter). **Share** copies a link with your code in it; nothing is sent to a server.

The sample data:

```ts
import { col, frame, len, table } from '@smaltworks/smaltdf';

await frame({ id: [1, 2, 3], name: ['Ann', 'Bo', 'Cy'], city: ['Austin', 'Boston', 'Austin'] }).createTable(db, 'customer');
await frame({ id: [1, 2, 3], name: ['tea', 'cake', 'jam'], price: [4.5, 3.25, 6] }).createTable(db, 'product');
await frame({
  id: [1, 2, 3, 4, 5, 6],
  customer_id: [1, 1, 2, 3, 2, 3],
  product_id: [1, 2, 3, 1, 1, 2],
  quantity: [2, 1, 4, 1, 3, 2],
  sold: ['2026-10-01', '2026-10-03', '2026-10-03', '2026-10-12', '2026-11-02', '2026-11-05'],
}).createTable(db, 'sale');
```

| rows |
| --- |
| 6 |

```ts
table('sale')
  .join(table('customer').select(col('id').alias('customer_id'), 'city'), { on: 'customer_id' })
  .join(table('product').select(col('id').alias('product_id'), col('name').alias('product'), 'price'), { on: 'product_id' })
  .groupBy('city', 'product')
  .agg(col('quantity').sum().alias('sold'), col('quantity').mul(col('price')).sum().alias('revenue'))
  .sort(['revenue', 'city', 'product'], { descending: [true, false, false] });
```

| city | product | sold | revenue |
| --- | --- | --- | --- |
| Boston | jam | 4 | 24 |
| Austin | tea | 3 | 13.5 |
| Boston | tea | 3 | 13.5 |
| Austin | cake | 3 | 9.75 |

Ideas: a window (`col('revenue').rank({ descending: true }).over()`), `col('sold').str.toDate().dt.truncate('1mo')`, or
`len()` per city. The [reference](./reference/) has more, each page with playgrounds of its own.
