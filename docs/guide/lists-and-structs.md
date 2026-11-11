# Lists and structs

Two kinds of types hold values of other types: `list<T>`, a list of `T` values, and `struct<name T, …>`, named fields.
They nest to any depth: a list of structs, a struct with a list field.

`frame(…)` reads a column of JS arrays as a list and of plain objects as a struct, its type from the values;
`collect` gives them back as arrays and objects.

```ts
import { col, frame, table } from '@smaltworks/smaltdf';

const orders = frame({
  id: [1, 2, 3],
  items: [['tea', 'jam'], [], null],
  ship: [{ city: 'Oslo', days: 2 }, { city: 'Rome', days: 5 }, null],
});
const r = await orders.collect(db);
r.types;
```

| value |
| --- |
| `["int","list<text>","struct<city text, days int>"]` |

## List methods

The methods of [`expr.list`](../reference/list/) read and change lists: size, elements by position, slices, sorting,
sums, and joining text.

```ts
orders.select(
  'id',
  col('items').list.len().alias('n'),
  col('items').list.first().alias('first'),
  col('items').list.contains('jam').alias('has_jam'),
  col('items').list.sort().list.join(', ').alias('all'),
);
```

| id | n | first | has_jam | all |
| --- | --- | --- | --- | --- |
| 1 | 2 | tea | true | jam, tea |
| 2 | 0 | null | false |  |
| 3 | null | null | null | null |

## Struct fields

[`struct.field`](../reference/list/field) reads a field; [`unnest`](../reference/frames/unnest) makes a column of each.

```ts
orders.filter(col('ship').struct.field('days').lt(3)).select('id', col('ship').struct.field('city'));
```

| id | city |
| --- | --- |
| 1 | Oslo |

## Rows and lists

[`explode`](../reference/frames/explode) gives a row per element, and [`implode`](../reference/aggregates/implode)
gathers a group's values into a list. An empty list gives no row and a null list one null row, unless the options say
otherwise.

```ts
orders.select('id', 'items').explode('items');
```

| id | items |
| --- | --- |
| 1 | tea |
| 1 | jam |
| 3 | null |

## In tables

A table that [`createTable`](../reference/writing/createTable) makes stores lists and structs as `LIST` and `STRUCT`
columns, with their full type, and a write into one takes values of its own type only.

```ts
await orders.createTable(db, 'orders');
const stored = await table('orders').collect(db);
stored.types;
```

| value |
| --- |
| `["int","list<text>","struct<city text, days int>"]` |
