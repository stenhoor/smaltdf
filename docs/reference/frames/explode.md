# `explode`

One row per element of a list column, the other columns repeated.

```railroad
explode
```

## Signature

```typescript
frame.explode(column: string, options?: { emptyAsNull?: boolean; keepNulls?: boolean }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `column` | `string` | A column of type `list<T>`. |
| `emptyAsNull` | `boolean` | An empty list gives one row with null. Default `false`: no row. |
| `keepNulls` | `boolean` | A null list gives one row with null. Default `true`; `false` gives none. |

## Returns

A frame with the same columns, the list column now of its element type `T`, in the frame's order and then each list's.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | No column has that name. |
| `SMALTDF_TYPE` | The column isn't a list. |

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
