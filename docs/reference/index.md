# Reference

smaltdf is a TypeScript language for [smaltdb](https://smaltdb.dev) with dataframe interfaces. A frame describes rows
with named, typed columns; its methods build new frames, and expressions compute their columns. Nothing runs until a
frame is collected: then smaltdf builds the plan it means for smaltdb's engine, which runs it. This reference has a page
for every function and method, each with its syntax, its parameters, what it gives, its errors, and examples you can
run on the page.

```ts
import { col, frame, len, lit, table } from '@smaltworks/smaltdf';

const orders = frame({ id: [1, 2, 3], region: ['n', 's', 'n'], qty: [3, 12, 7] });
orders.groupBy('region', { maintainOrder: true }).agg(col('qty').sum(), len());
```

| region | qty | len |
| --- | --- | --- |
| n | 10 | 2 |
| s | 12 | 1 |

## The parts

| Part | What it covers |
| --- | --- |
| [Frames](./frames/) | Sources (`table`, `frame`, `concat`), columns, rows, `groupBy`, joins, reshaping, `collect` and `plan` |
| [Expressions](./expressions/) | `col`, `lit`, arithmetic, comparison, logic, null tests, `cast`, `alias`, `round` |
| [Aggregates](./aggregates/) | `sum`, `mean`, `min`, `max`, `count`, `len`, `first`, `last`, `median`, `std`, `var`, `implode` |
| [Windows](./windows/) | `over`, running values, `shift`, `rank` |
| [Text (str)](./str/) | Case, patterns, and reading dates from text |
| [Dates and times (dt)](./dt/) | Parts, truncating and moving, formatting, time zones |
| [Lists and structs](./list/) | The `list` methods and `struct.field` |
| [Writing and views](./writing/) | `createTable`, `insertInto`, `update`, `deleteFrom`, views, `dfLanguage` |
| [API](./api) | The types: `Frame`, `Expr`, `DfResult`, `DfError` and the rest |

## Syntax

Each page opens with a syntax diagram of its function or method, drawn from smaltdf's grammar (`docs/grammar.ebnf`).
A box with rounded ends is written as it is; a square box is another rule: click it to see that rule in place. The
grammar names smaltdf's functions and methods and their arguments. TypeScript's own syntax (calls, strings, numbers,
objects, arrays) is not repeated.

```railroad
frame
expr
```

## Types

Every column has a type, known when the frame's plan is built, before anything runs.

| Type | Holds | From JavaScript | `collect` gives |
| --- | --- | --- | --- |
| `int` | 64-bit integers | whole numbers, bigints | a number, or a bigint beyond ±2^53 |
| `real` | 64-bit floats, NaN and Infinity included | numbers with a fraction | a number |
| `bool` | true and false | booleans | `true`, `false` |
| `text` | Unicode text | strings | a string |
| `blob` | bytes | `Uint8Array`s | a `Uint8Array` |
| `date`, `datetime`, `time`, `duration` | dates and times, to the µs | `Date`s (`datetime`) | text, or a `Date` for `datetime` |
| `list<T>`, `struct<name T, …>` | lists and named fields | arrays, plain objects | arrays, objects |
| `any` | a value of any type | | as its value |
| `null` | only null, which fits any type | `null` | `null` |

Every type holds null too.

## Rules every method follows

- **Nothing runs until `collect`.** Building a frame or an expression checks only its own arguments. Names and types are
  checked when the plan is built, against the database's catalog.
- **A string is a column where a method takes columns** (`select('id')`, `sort('qty')`, `groupBy('region')`), and text
  where it takes a value (`col('name').eq('ann')`).
- **Nulls:** a null operand gives null, except in null tests, `eqMissing`, and `and` / `or`, which follow three-valued
  logic. `filter` keeps a row only where its predicates are true.
- **Order:** `filter`, `select`, `withColumns`, `sort` (stable), `head`, `tail`, `slice`, `explode`, `unnest`, `unpivot`,
  windows and `concat` keep the frame's order. `groupBy`, `unique`, `join` and `pivot` give rows in no particular order
  unless asked (`maintainOrder: true`).
- **Strict arithmetic and conversion:** an integer overflow is an error (`SMALT_RANGE`), and so is a value that doesn't
  convert (`SMALT_MISMATCH`). Division (`div`) is always `real`.
- **Errors name the method:** `filter: no column "qtty" in orders (columns: id, qty, price)`. The codes are listed in
  [Errors](../guide/errors).
