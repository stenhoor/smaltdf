# Lists and structs

Two kinds of types hold values of other types: `list<T>`, a list of `T` values, and `struct<name T, …>`, named fields,
nested to any depth. `frame(…)` reads a column of JS arrays as a list and of plain objects as a struct, and `collect`
gives them back as arrays and objects. The methods of `expr.list` work on lists, and `expr.struct.field` reads a field.

```ts
import { col } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Size and elements

- [`list.len`](./len): The number of elements, nulls included.
- [`list.get`](./get): The element at a position, or null out of range.
- [`list.first`](./first): The first element, or null for an empty list.
- [`list.last`](./last): The last element, or null for an empty list.
- [`list.contains`](./contains): Whether an element equals a value.
- [`list.item`](./item): The element of a list of one.

### Parts

- [`list.slice`](./slice): The elements from a position, `length` of them or all the rest.
- [`list.head`](./head): The first `n` elements.
- [`list.tail`](./tail): The last `n` elements.
- [`list.concat`](./concat): The list's elements, then another's.
- [`list.gather`](./gather): The elements at a list of positions.
- [`list.gatherEvery`](./gatherEvery): Every `n`-th element.
- [`list.sample`](./sample): Elements chosen at random.
- [`list.dropNulls`](./dropNulls): The non-null elements.
- [`list.shift`](./shift): The elements moved later or earlier, nulls filling the places left.

### Order and repeats

- [`list.sort`](./sort): The elements sorted, nulls first (or last).
- [`list.unique`](./unique): The elements without repeats: the first of each, in order.
- [`list.reverse`](./reverse): The elements in reverse order.
- [`list.nUnique`](./nUnique): The number of distinct elements.
- [`list.countMatches`](./countMatches): The number of elements equal to a value.

### Numbers

- [`list.sum`](./sum): The sum of the non-null elements; 0 for none.
- [`list.mean`](./mean): The mean of the non-null elements; null for none.
- [`list.min`](./min): The smallest non-null element; null for none.
- [`list.max`](./max): The largest non-null element; null for none.
- [`list.median`](./median): The median of the non-null elements.
- [`list.std`](./std): The standard deviation of the non-null elements.
- [`list.var`](./var): The variance of the non-null elements.
- [`list.argMin`](./argMin): The position of the smallest non-null element.
- [`list.argMax`](./argMax): The position of the largest non-null element.
- [`list.diff`](./diff): Each element less the one before it.

### Truth values

- [`list.all`](./all): Whether every non-null element is true.
- [`list.any`](./any): Whether any non-null element is true.

### Sets

Each element once (null is one value), in first-appearance order.

- [`list.setUnion`](./setUnion): The elements of either list.
- [`list.setIntersection`](./setIntersection): The elements of both lists.
- [`list.setDifference`](./setDifference): The elements of this list that aren't in another.
- [`list.setSymmetricDifference`](./setSymmetricDifference): The elements of one list but not both.

### Text

- [`list.join`](./join): A list of text's non-null elements, joined by a separator.

### Expressions over elements

A body runs per element in one pass over each list: [`element()`](./element) is the element, and `col` reads the row.

- [`list.eval`](./eval): The list of an expression for each element.
- [`list.filter`](./filter): The elements for which a predicate is true.
- [`list.agg`](./agg): An expression of aggregates over the elements.
- [`element`](./element): The element a body runs over; `element(1)` the one around it.
- [`position`](./position): The position of `element()` in its list.

### Structs

- [`struct.field`](./field): A struct's field, by name.

## Rules they share

- **Lists only:** each `list` method takes a `list<…>`; anything else is an error when the plan is built
  (`SMALTDF_TYPE`, `list.len: takes a list, not int`).
- **Nulls:** a null list gives null. Null elements are elements: they count in `len` and sort first in `sort`; the
  numeric methods (`sum`, `mean`, `min`, `max`, `median`, `std`, `var`, `argMin`, `argMax`), and `all` and `any`,
  skip them.
- **Positions** count from 0; a negative position counts from the end, `-1` the last element.
- **Rows:** [`explode`](../frames/explode) makes a row per element, [`implode`](../aggregates/implode) a list per
  group, and [`unnest`](../frames/unnest) a column per field.
