# Data from JavaScript

[`frame({ … })`](../reference/frames/frame) gives rows from JavaScript data: one column per key, all of one length.
Such a frame takes every method, joins tables, and can be written to a table.

```ts
import { col, frame } from '@smaltworks/smaltdf';

const readings = frame({
  sensor: ['a', 'b', 'a', null],
  value: [1.5, 2, 3.25, 4],
  ok: [true, true, false, true],
});
readings.filter(col('ok'));
```

| sensor | value | ok |
| --- | --- | --- |
| a | 1.5 | true |
| b | 2 | true |
| null | 4 | true |

## Column types

A column's type comes from its values:

| Values | Type |
| --- | --- |
| numbers, all whole | `int` |
| numbers, any with a fraction | `real` |
| bigints | `int` |
| strings | `text` |
| booleans | `bool` |
| `Uint8Array`s | `blob` |
| `Date`s | `datetime` |
| arrays | `list<…>` |
| plain objects | `struct<…>` |
| `Int8Array` … `Uint32Array`, `BigInt64Array` | `int` |
| `Float32Array`, `Float64Array` | `real` (NaN is NaN) |

`null` and `undefined` are null in any column. A column that mixes kinds (numbers and strings) is an error.

```ts
const typed = frame({ id: new Int32Array([1, 2, 3]), x: new Float64Array([0.5, NaN, 2]), at: [new Date('2026-11-07T10:00:00Z'), null, null] });
const r = await typed.collect(db);
r.types;
```

| value |
| --- |
| ["int","real","datetime"] |

## Big data

Through the client, typed arrays cross to the worker as binary data, so a column of a million numbers is one copy, not
a million values. Prefer typed arrays for large numeric columns.

## Back to JavaScript

[`collect`](../reference/frames/collect) gives the rows as arrays, and `toObjects()` as objects. An integer in the safe
range (±2^53) comes back as a number, a larger one as a bigint.

```ts
(await readings.filter(col('value').gt(2)).collect(db)).toObjects();
```

| sensor | value | ok |
| --- | --- | --- |
| a | 3.25 | false |
| null | 4 | true |

## Keeping it

A frame of data can be written to a table with [`createTable`](../reference/writing/createTable), then read by name.
Views read tables and views, not data from JavaScript: write the data to a table first.
