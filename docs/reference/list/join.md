# `list.join`

A list of text's non-null elements, joined by a separator.

```railroad
list-join
```

## Signature

```typescript
expr.list.join(separator: string, options?: { ignoreNulls?: boolean }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `separator` | `string` | Put between elements. |
| `ignoreNulls` | `boolean` | Leave null elements out (default `true`); with `false`, a null element makes the result null. |

## Returns

`text`: empty for an empty list, null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of text. |

## Examples

Tags as one string:

```ts
const posts = frame({ tags: [['a', 'b'], [], null, ['c', null]] });
posts.select('tags', col('tags').list.join(', ').alias('joined'));
```

| tags | joined |
| --- | --- |
| ["a","b"] | a, b |
| [] |  |
| null | null |
| ["c",null] | c |

Keeping nulls:

```ts
const names = frame({ parts: [['Ada', null, 'Lovelace'], ['Grace', 'Hopper']] });
names.select(col('parts').list.join(' ').alias('skip'), col('parts').list.join(' ', { ignoreNulls: false }).alias('keep'));
```

| skip | keep |
| --- | --- |
| Ada Lovelace | null |
| Grace Hopper | Grace Hopper |

## Demo

A path from its parts:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ parts: [['usr', 'local', 'bin']] }).select(col('parts').list.join('/').alias('path'));
```

| path |
| --- |
| usr/local/bin |

## See also

[`list.concat`](./concat), [`implode`](../aggregates/implode)
