# Expressions

An expression computes a value for each row: a column (`col`), a constant (`lit`), and methods that combine them.
Expressions are used in `select`, `withColumns`, `filter`, `sort` and the other frame methods. Like frames, they run
nothing until their frame runs.

```ts
import { col, lit } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Columns and values

- [`col`](./col): A column of the frame, by name.
- [`lit`](./lit): A constant: the same value on every row.
- [`alias`](./alias): The same expression under another name.
- [`cast`](./cast): The value converted to another type.
- [`round`](./round): The number rounded to `digits` decimal places, half to even.

### Arithmetic

- [`add`](./add): The sum of two numbers, or a date or time moved by a `duration`.
- [`sub`](./sub): The difference of two numbers, or of two dates or times (a `duration`).
- [`mul`](./mul): The product of two numbers, or a `duration` times an `int`.
- [`div`](./div): True division: the quotient as a `real`.
- [`floorDiv`](./floorDiv): Division rounded toward negative infinity.
- [`mod`](./mod): The remainder of floor division, with the sign of the divisor.

### Comparison

- [`eq`](./eq): Whether two values are equal.
- [`ne`](./ne): Whether two values differ.
- [`lt`](./lt): Whether the value is less than the other.
- [`le`](./le): Whether the value is less than or equal to the other.
- [`gt`](./gt): Whether the value is greater than the other.
- [`ge`](./ge): Whether the value is greater than or equal to the other.
- [`eqMissing`](./eqMissing): Equality where null equals null: never null itself.

### Logic

- [`and`](./and): Whether both conditions are true, with three-valued logic.
- [`or`](./or): Whether either condition is true, with three-valued logic.
- [`not`](./not): The opposite of a condition: null stays null.

### Null tests

- [`isNull`](./isNull): Whether the value is null. Never null itself.
- [`isNotNull`](./isNotNull): Whether the value is not null. Never null itself.

## Rules they share

- **Arguments.** Where a method takes another operand (`add`, `gt`, `and` …), it is an expression or a JavaScript value:
  a number, bigint, string, boolean, `Uint8Array`, `Date` or `null`. A string there is text, not a column: write
  `col('qty')` for the column.
- **Nulls.** A null operand gives a null result, except where a page says otherwise: `isNull`, `isNotNull`,
  `eqMissing`, and `and` / `or`, which follow three-valued logic.
- **Types.** `int` with `int` stays `int`; any `real` makes `real`. Comparisons and logic give `bool`. A method checks
  its operands' types when the frame's plan is built, and names itself in the error: `filter: add: takes numbers, not
  text and int`.
- **Names.** An expression is named after the first column it reads (`col('qty').mul(2)` is `qty`), a literal `literal`;
  [`alias`](./alias) gives another name.
