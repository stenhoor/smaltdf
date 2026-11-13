# `struct.drop`

The struct without some of its fields.

```railroad
struct-drop
```

## Signature

```typescript
expr.struct.drop(...fields: string[]): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `fields` | `string[]` | The names of the fields to leave out. |

## Returns

A struct of the other fields, in order; null for a null struct.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a struct, or no field would be left. |
| `SMALTDF_SCHEMA` | The struct has no field of a name. |

## Examples

```ts
const points = frame({ id: [1, 2, 3], pt: [{ x: 1, y: 2.5 }, { x: 3, y: null }, null] });
points.select(col('pt').struct.drop('y').alias('pt'));
```

| pt |
| --- |
| {"x":1} |
| {"x":3} |
| null |

## Demo

A record without its secret:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ user: [{ name: 'ana', token: 'x1' }] }).select(col('user').struct.drop('token'));
```

| user |
| --- |
| {"name":"ana"} |

## See also

[`struct.select`](./select), [`struct.withFields`](./withFields), [`unnest`](../frames/unnest)
