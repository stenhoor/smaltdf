# Errors

smaltdf's errors say what went wrong and name the method that caused it. Most are found before anything runs: when a
frame's plan is built, smaltdf knows every column's type, so a wrong name or type is an error then.

```ts
import { col, frame } from '@smaltworks/smaltdf';

const orders = frame({ id: [1, 2], qty: [3, 12], note: ['ok', 'late'] });
const err = await orders.filter(col('qty').add(col('note')).gt(1)).collect(db).catch((e) => e);
({ name: err.name, code: err.code, message: err.message });
```

| name | code | message |
| --- | --- | --- |
| DfError | SMALTDF_TYPE | filter: add: takes numbers, not int and text |

## The error

Errors are `DfError`s: an `Error` with a `code`, and a message that starts with the method and, for an expression, the
expression's method (`filter: add: …`). An error the engine raises while a frame runs is given back the same way, with
the engine's error as its `cause`.

## Codes

| Code | When | Example |
| --- | --- | --- |
| `SMALTDF_SCHEMA` | A name the frame uses doesn't exist, or two columns get one name | `select: no column "nope" in orders (columns: id, qty)` |
| `SMALTDF_TYPE` | A value has the wrong type for a method | `filter: add: takes numbers, not int and text` |
| `SMALTDF_RANGE` | An argument is out of its range | `head: expected a whole number of rows (0 or more), not -1` |
| `SMALT_RANGE` | An integer overflows while it runs | `select: mul: integer overflow in mul_checked` |
| `SMALT_MISMATCH` | A value doesn't convert while it runs | `select: cast: cannot convert text "a" to an integer` |
| `SMALT_CONSTRAINT_…` | A write breaks a constraint: `_UNIQUE`, `_PRIMARYKEY`, `_NOTNULL`, `_CHECK`, `_FOREIGNKEY` | |
| `SMALT_ERROR` | Other engine errors: a table that exists, an invalid regular expression | |

The engine's codes are on [smaltdb.dev](https://smaltdb.dev/reference/api/errors). Each reference page lists the errors
its method raises.

## When they happen

| Found | Errors |
| --- | --- |
| When a method is called | Its own arguments: `head(-1)`, `frame({ a: [1, 'x'] })` |
| When the plan is built (`collect`, `plan`, a write) | Names and types, against the database's catalog |
| While it runs | Overflow, conversion, constraints |

The first two run nothing: a frame with a wrong name or type never starts.

## Strict by design

An integer overflow is an error, not a wrap-around or a float; a value that doesn't convert is an error, not null or 0:

<!-- docs:error SMALT_MISMATCH -->
```ts
frame({ n: ['12', 'twelve'] }).select(col('n').cast('int'));
```

Division by zero is not an error: `div` gives Infinity or NaN, and integer `floorDiv` and `mod` give null.
