# `list.toStruct`

A struct of a list's elements, by position.

```railroad
list-toStruct
```

## Signature

```typescript
expr.list.toStruct(fields: string[]): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `fields` | `string[]` | A name for each position, from the first. |

## Returns

A `struct<name T, …>` of the element type; a missing element is null; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list, or no name is given, or one twice. |
| `SMALTDF_RANGE` | A name isn't letters, digits and `_`. |

## Examples

```ts
const posts = frame({ id: [1, 2, 3], scores: [[3, 1, 2], [5], null] });
posts.select('scores', col('scores').list.toStruct(['first', 'second']).alias('top'));
```

| scores | top |
| --- | --- |
| [3,1,2] | {"first":3,"second":1} |
| [5] | {"first":5,"second":null} |
| null | null |

## Demo

Coordinates from a pair:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ pair: [[48.85, 2.35]] }).select(col('pair').list.toStruct(['lat', 'lon']));
```

| pair |
| --- |
| {"lat":48.85,"lon":2.35} |

## See also

[`list.get`](./get), [`struct`](./struct), [`unnest`](../frames/unnest)
