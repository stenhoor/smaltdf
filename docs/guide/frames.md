# Frames and expressions

A frame describes rows with named, typed columns. It is a description of a computation, not data: building one runs
nothing. This page is about how frames are built, when they run, and how expressions compute their columns.

## A frame is a chain of methods

A frame starts from a source and each method gives a new frame. The original is never changed.

```ts
import { col, frame, table } from '@smaltworks/smaltdf';

const orders = frame({
  id: [1, 2, 3, 4],
  region: ['n', 's', 'n', 'e'],
  qty: [3, 12, 7, null],
  price: [2.5, 1, 4, 3],
});
const big = orders.filter(col('qty').gt(5));
const report = big.select('id', col('qty').mul(col('price')).alias('total'));
report;
```

| id | total |
| --- | --- |
| 2 | 12 |
| 3 | 28 |

`orders`, `big` and `report` are three frames. Building them ran nothing.

The sources:

| Source | Rows |
| --- | --- |
| [`table(name)`](../reference/frames/table) | A table or view in the database |
| [`frame({ … })`](../reference/frames/frame) | JavaScript data: arrays and typed arrays |
| [`concat([…])`](../reference/frames/concat) | Frames one after another |

## Running a frame

`collect(db)` builds the frame's plan against the database, runs it in the engine, and gives the columns, their types
and the rows.

```ts
const result = await report.collect(db);
result.toObjects();
```

| id | total |
| --- | --- |
| 2 | 12 |
| 3 | 28 |

`plan(db)` gives the plan without running it: plain data in smaltdb's
[plan language](https://smaltdb.dev/reference/engine/plans), which any language on the engine builds.

## Checked before anything runs

When the plan is built, smaltdf reads each table's columns from the database's catalog and works out every
expression's type. A wrong name or type is an error then, before the engine runs anything, and it names the method:

<!-- docs:error SMALTDF_SCHEMA -->
```ts
orders.filter(col('qtty').gt(5));
```

The error is `filter: no column "qtty" in frame(…) (columns: id, region, qty, price)`.

## Expressions

An expression computes a value for each row. It starts from a column or a constant and chains methods:

```ts
orders.select(
  'id',
  col('qty').mul(col('price')).alias('total'),
  col('price').ge(3).alias('dear'),
  col('region').str.upper().alias('region'),
);
```

| id | total | dear | region |
| --- | --- | --- | --- |
| 1 | 7.5 | false | N |
| 2 | 12 | false | S |
| 3 | 28 | true | N |
| 4 | null | true | E |

- `col(name)` is a column, `lit(value)` a constant. A method's operand can be a plain value: `col('qty').gt(5)`.
- A string as an operand is text: `col('region').eq('n')`. Where a frame method takes columns (`select('id')`), a string
  is a column.
- An expression is named after the first column it reads; `alias` names it.

The [expressions reference](../reference/expressions/) has every method, with the [aggregates](../reference/aggregates/),
[windows](../reference/windows/), and the `str`, `dt` and `list` methods.

## Types and nulls

Every column has a type: `int`, `real`, `bool`, `text`, `blob`, the date and time types, `list<…>` and `struct<…>`.
Each also holds null. A null operand gives a null result, and `filter` keeps only the rows where its condition is true,
so a null drops the row:

```ts
orders.select('id', 'qty', col('qty').gt(5).alias('big'), col('qty').isNull().alias('missing'));
```

| id | qty | big | missing |
| --- | --- | --- | --- |
| 1 | 3 | false | false |
| 2 | 12 | true | false |
| 3 | 7 | true | false |
| 4 | null | null | true |

The [reference overview](../reference/#types) lists the types and what `collect` gives for each.
