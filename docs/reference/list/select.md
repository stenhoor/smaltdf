# `struct.select`

A struct of some of the fields, in a given order.

```railroad
struct-select
```

## Signature

```typescript
expr.struct.select(...fields: string[]): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `fields` | `string[]` | The names of the fields to keep, in the order wanted. |

## Returns

A struct of those fields; null for a null struct.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a struct, or no name is given, or one twice. |
| `SMALTDF_SCHEMA` | The struct has no field of a name. |

## Examples

```ts
const points = frame({ id: [1, 2, 3], pt: [{ x: 1, y: 2.5 }, { x: 3, y: null }, null] });
points.select(col('pt').struct.select('y', 'x').alias('pt'));
```

| pt |
| --- |
| {"y":2.5,"x":1} |
| {"y":null,"x":3} |
| null |

## Demo

Fields in the order a report wants:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ row: [{ id: 7, total: 9.5, region: 'n' }] }).select(col('row').struct.select('region', 'total'));
```

| row |
| --- |
| {"region":"n","total":9.5} |

## See also

[`struct.drop`](./drop), [`struct.field`](./field), [`struct.renameFields`](./renameFields)
