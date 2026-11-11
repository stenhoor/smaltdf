# Columns, rows and order

Picking and computing columns, keeping rows, and putting them in order.

```ts
import { col, frame } from '@smaltworks/smaltdf';

const people = frame({
  name: ['ann', 'bo', 'cy', 'di', 'ed'],
  city: ['Oslo', 'Rome', 'Oslo', 'Lima', 'Rome'],
  age: [34, 28, 41, null, 28],
});
people;
```

| name | city | age |
| --- | --- | --- |
| ann | Oslo | 34 |
| bo | Rome | 28 |
| cy | Oslo | 41 |
| di | Lima | null |
| ed | Rome | 28 |

## Columns

[`select`](../reference/frames/select) gives exactly the columns it names, in that order;
[`withColumns`](../reference/frames/withColumns) keeps every column and adds or replaces some.

```ts
people.select('name', col('age').add(1).alias('next_year'));
```

| name | next_year |
| --- | --- |
| ann | 35 |
| bo | 29 |
| cy | 42 |
| di | null |
| ed | 29 |

```ts
people.withColumns(col('city').str.upper(), col('age').ge(30).alias('over_30'));
```

| name | city | age | over_30 |
| --- | --- | --- | --- |
| ann | OSLO | 34 | true |
| bo | ROME | 28 | false |
| cy | OSLO | 41 | true |
| di | LIMA | null | null |
| ed | ROME | 28 | false |

## Rows

[`filter`](../reference/frames/filter) keeps the rows where every condition is true. Several conditions are all
required; [`or`](../reference/expressions/or) gives either.

```ts
people.filter(col('city').eq('Oslo').or(col('age').lt(30)));
```

| name | city | age |
| --- | --- | --- |
| ann | Oslo | 34 |
| bo | Rome | 28 |
| cy | Oslo | 41 |
| ed | Rome | 28 |

[`unique`](../reference/frames/unique) keeps one row per distinct value; [`head`](../reference/frames/head),
[`tail`](../reference/frames/tail) and [`slice`](../reference/frames/slice) take rows by position;
[`sample`](../reference/frames/sample) draws them at random.

```ts
people.unique({ subset: 'city', maintainOrder: true }).select('city');
```

| city |
| --- |
| Oslo |
| Rome |
| Lima |

## Order

[`sort`](../reference/frames/sort) orders rows by one or more keys. It is stable: rows with equal keys keep the order
they had. Nulls come first unless `nullsLast`.

```ts
people.sort(['age', 'name'], { descending: [true, false], nullsLast: true });
```

| name | city | age |
| --- | --- | --- |
| cy | Oslo | 41 |
| ann | Oslo | 34 |
| bo | Rome | 28 |
| ed | Rome | 28 |
| di | Lima | null |

Which methods keep order:

| Keep the frame's order | Give rows in no particular order, unless `maintainOrder: true` |
| --- | --- |
| `filter`, `select`, `withColumns`, `sort`, `head`, `tail`, `slice`, `explode`, `unnest`, `unpivot`, windows, `concat` | `groupBy`, `unique`, `join`, `pivot` |

Keeping order costs work, so the methods that group or match rows don't, unless asked.
