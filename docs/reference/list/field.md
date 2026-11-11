# `struct.field`

A struct's field, by name.

```railroad
struct-field
```

## Signature

```typescript
expr.struct.field(name: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | The field. |

## Returns

The field's value, of its type, named as the field; null for a null struct.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a struct. |
| `SMALTDF_SCHEMA` | The struct has no field of that name (the error lists its fields). |

## Examples

Fields of a point:

```ts
const pts = frame({ id: [1, 2], at: [{ x: 1, y: 2.5 }, null] });
pts.select('id', col('at').struct.field('x'), col('at').struct.field('y'));
```

| id | x | y |
| --- | --- | --- |
| 1 | 1 | 2.5 |
| 2 | null | null |

A field it doesn't have:

<!-- docs:error SMALTDF_SCHEMA -->
```ts
pts.select(col('at').struct.field('z'));
```

## Demo

Filtering on a field:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const users = frame({ profile: [{ name: 'ann', age: 34 }, { name: 'bo', age: 17 }] });
users.filter(col('profile').struct.field('age').ge(18)).select(col('profile').struct.field('name'));
```

| name |
| --- |
| ann |

## See also

[`unnest`](../frames/unnest), [`Lists and structs`](../../guide/lists-and-structs)
