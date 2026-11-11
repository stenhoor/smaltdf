# `unnest`

A struct column replaced by one column per field.

```railroad
unnest
```

## Signature

```typescript
frame.unnest(column: string): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `column` | `string` | A column of type `struct<…>`. |

## Returns

A frame with the struct column replaced, in its place, by its fields, named and typed as they are. A null struct gives nulls.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | No column has that name, or a field's name is taken by another column. |
| `SMALTDF_TYPE` | The column isn't a struct. |

## Examples

Points to x and y:

```ts
const shapes = frame({ id: [1, 2], at: [{ x: 1, y: 2 }, null] });
shapes.unnest('at');
```

| id | x | y |
| --- | --- | --- |
| 1 | 1 | 2 |
| 2 | null | null |

## Demo

Nested records, flat:

```ts
import { frame } from '@smaltworks/smaltdf';

frame({ user: [{ name: 'ann', age: 34 }, { name: 'bo', age: 28 }], visits: [3, 5] }).unnest('user');
```

| name | age | visits |
| --- | --- | --- |
| ann | 34 | 3 |
| bo | 28 | 5 |

## See also

[`field`](../list/field), [`explode`](../frames/explode)
