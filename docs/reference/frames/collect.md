# `collect`

Runs the frame in the engine and gives its columns, types and rows.

```railroad
collect
```

## Signature

```typescript
frame.collect(db: Db): Promise<DfResult>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `db` | `Db` | A smaltdb database: `Database` from `smaltdb/engine` in process, or the client's `Database` from `open()` in `smaltdb`. |

## Returns

A promise of `{ columns, types, rows, toObjects() }`: the column names, their smaltdf types, the rows as arrays,
and the rows as objects. Values come back as JavaScript values:

| Type | Value |
| --- | --- |
| `int` | a number, or a bigint beyond ±2^53 |
| `real` | a number (NaN and Infinity included) |
| `bool` | `true` or `false` |
| `text` | a string |
| `blob` | a `Uint8Array` |
| `date`, `time` | text: `2026-11-07`, `13:04:05.678` |
| `datetime` | a JS `Date` |
| `duration` | ISO 8601 text: `P1DT2H30M` |
| `list<…>`, `struct<…>` | arrays and objects |

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A name the frame uses isn't in the database (checked before anything runs). |
| `SMALTDF_TYPE` | An expression has the wrong type for its method (checked before anything runs). |
| `SMALT_RANGE` | An integer overflows while it runs. |
| `SMALT_MISMATCH` | A value doesn't convert while it runs. |

## Notes

- The plan is built from the database's catalog each time, so a frame can run against several databases.
- An error while it runs names the method its plan node came from: `select: mul: integer overflow in mul_checked`.

## Examples

The result's parts:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
const result = await orders.filter(col('qty').gt(5)).collect(db);
result.types;
```

| value |
| --- |
| ["int","text","int","real"] |

Rows as objects:

```ts
result.toObjects();
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 2 | s | 12 | 1 |
| 3 | n | 7 | 4 |

## Demo

Running a frame:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const r = await frame({ a: [1, 2, 3] }).select(col('a').mul(10).alias('b')).collect(db);
r.rows;
```

| value |
| --- |
| [[10],[20],[30]] |

## See also

[`plan`](../frames/plan), [`API`](../api), [`Errors`](../../guide/errors)
