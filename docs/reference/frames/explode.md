# `explode`

One row per element of a list column, the other columns repeated; several list columns are exploded together.

```railroad
explode
```

## Signature

```typescript
frame.explode(columns: string | string[], options?: { emptyAsNull?: boolean; keepNulls?: boolean }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `columns` | `string \| string[]` | A column of type `list<T>`, or several: exploded together, element by element. |
| `emptyAsNull` | `boolean` | An empty list gives one row with null. Default `false`: no row. |
| `keepNulls` | `boolean` | A null list gives one row with null. Default `true`; `false` gives none. |

## Returns

A frame with the same columns, each exploded column now of its element type `T`, in the frame's order and then each list's.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | No column has that name. |
| `SMALTDF_SCHEMA` | A column is named twice, or none is named. |
| `SMALTDF_TYPE` | A column isn't a list. |
| `SMALT_RANGE` | Exploding several columns, a row's lists have different lengths (a null list matches only null). |

## Examples

Tags, one per row:

```ts
const posts = frame({ id: [1, 2, 3], tags: [['a', 'b'], [], null] });
posts.explode('tags');
```

| id | tags |
| --- | --- |
| 1 | a |
| 1 | b |
| 3 | null |

Empty lists as null rows, null lists dropped:

```ts
posts.explode('tags', { emptyAsNull: true, keepNulls: false });
```

| id | tags |
| --- | --- |
| 1 | a |
| 1 | b |
| 2 | null |

Two columns together, element by element:

```ts
const orders = frame({ id: [1, 2], items: [['pen', 'ink'], ['pad']], qty: [[2, 1], [5]] });
orders.explode(['items', 'qty']);
```

| id | items | qty |
| --- | --- | --- |
| 1 | pen | 2 |
| 1 | ink | 1 |
| 2 | pad | 5 |

Lists of different lengths in a row are an error:

<!-- docs:error SMALT_RANGE -->
```ts
frame({ a: [[1, 2]], b: [['x']] }).explode(['a', 'b']);
```

## Demo

Lists to rows and back with `implode`:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const baskets = frame({ who: ['ann', 'bo'], items: [['tea', 'jam'], ['cake']] });
baskets.explode('items').groupBy('items', { maintainOrder: true }).agg(col('who').implode());
```

| items | who |
| --- | --- |
| tea | ["ann"] |
| jam | ["ann"] |
| cake | ["bo"] |

## See also

[`implode`](../aggregates/implode), [`unnest`](../frames/unnest), [`Lists and structs`](../../guide/lists-and-structs)
