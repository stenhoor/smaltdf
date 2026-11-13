# `struct.withFields`

The struct with fields added, or replaced where a name is taken.

```railroad
struct-withFields
```

## Signature

```typescript
expr.struct.withFields(fields: { [name: string]: ExprLike }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `fields` | `object` | Each field's name and value. A new name is added at the end; a taken one is replaced in place. |

## Returns

A struct; null for a null struct.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a struct, or no field is given. |
| `SMALTDF_RANGE` | A name isn't letters, digits and `_`. |

## Examples

```ts
const points = frame({ id: [1, 2, 3], pt: [{ x: 1, y: 2.5 }, { x: 3, y: null }, null] });
points.select(col('pt').struct.withFields({ id: col('id'), x: 0 }).alias('pt'));
```

| pt |
| --- |
| {"x":0,"y":2.5,"id":1} |
| {"x":0,"y":null,"id":2} |
| null |

## Demo

A label added to each point:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ pt: [{ x: 1, y: 2 }] }).select(col('pt').struct.withFields({ label: 'start' }));
```

| pt |
| --- |
| {"x":1,"y":2,"label":"start"} |

## See also

[`struct`](./struct), [`struct.field`](./field), [`struct.drop`](./drop), [`struct.renameFields`](./renameFields)
