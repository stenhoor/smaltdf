# `struct.renameFields`

The same values under new field names.

```railroad
struct-renameFields
```

## Signature

```typescript
expr.struct.renameFields(names: string[]): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `names` | `string[]` | One name per field, in order. |

## Returns

A struct; null for a null struct.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a struct, or the names aren't one per field, each once. |
| `SMALTDF_RANGE` | A name isn't letters, digits and `_`. |

## Examples

```ts
const points = frame({ id: [1, 2, 3], pt: [{ x: 1, y: 2.5 }, { x: 3, y: null }, null] });
points.select(col('pt').struct.renameFields(['lon', 'lat']).alias('pt'));
```

| pt |
| --- |
| {"lon":1,"lat":2.5} |
| {"lon":3,"lat":null} |
| null |

## Demo

Fields named for a chart:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ pt: [{ x: 1, y: 2 }] }).select(col('pt').struct.renameFields(['left', 'top']));
```

| pt |
| --- |
| {"left":1,"top":2} |

## See also

[`struct.withFields`](./withFields), [`struct.select`](./select), [`alias`](../expressions/alias)
