# `frame`

Rows from JavaScript data: one column per key, each an array or a typed array.

```railroad
frame-data
```

## Signature

```typescript
frame(columns: Record<string, ArrayLike<unknown>>): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `columns` | `Record<string, ArrayLike<unknown>>` | One entry per column, in order: an array of values, or a typed array. All have one length. |

## Returns

A frame of those rows. Each column's type comes from its values:

| Values | Type |
| --- | --- |
| `Int8Array` … `Uint32Array`, `BigInt64Array` | `int` |
| `Float32Array`, `Float64Array` (NaN is NaN) | `real` |
| numbers, all whole | `int` |
| numbers, any with a fraction | `real` |
| bigints | `int` |
| strings | `text` |
| booleans | `bool` |
| `Uint8Array`s | `blob` |
| JS `Date`s | `datetime` |
| arrays | `list<…>`, from their elements |
| plain objects | `struct<…>`, from their fields |
| only `null` and `undefined` | `null` |

`null` and `undefined` are null in any column.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | Two columns have different lengths. |
| `SMALTDF_TYPE` | A column mixes kinds of values, such as numbers and strings. |

## Notes

- An integer in the safe range (±2^53) comes back from `collect` as a number; one beyond it as a bigint.
- Through the client, typed arrays cross to the worker as binary data, without a copy per value.
- A frame of data takes every method, joins tables, and can be written with [`createTable`](../writing/createTable). A view can't read one: views read tables.

## Examples

Arrays of values:

```ts
const people = frame({ name: ['Ann', 'Bo', null], age: [34, 28, 41], member: [true, false, true] });
people;
```

| name | age | member |
| --- | --- | --- |
| Ann | 34 | true |
| Bo | 28 | false |
| null | 41 | true |

Typed arrays:

```ts
frame({ x: new Int32Array([1, 2, 3]), y: new Float64Array([0.5, NaN, 2]) });
```

| x | y |
| --- | --- |
| 1 | 0.5 |
| 2 | NaN |
| 3 | 2 |

A column that mixes kinds is an error:

<!-- docs:error SMALTDF_TYPE -->
```ts
frame({ v: [1, 'two'] });
```

## Demo

Data from JavaScript, filtered:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const readings = frame({ sensor: ['a', 'b', 'a', 'b'], value: new Float64Array([1.5, 2.25, 3, 0.75]) });
readings.filter(col('value').gt(1));
```

| sensor | value |
| --- | --- |
| a | 1.5 |
| b | 2.25 |
| a | 3 |

## See also

[`table`](../frames/table), [`concat`](../frames/concat), [`createTable`](../writing/createTable), [`Data from JavaScript`](../../guide/javascript-data)
