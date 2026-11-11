# `col`

A column of the frame, by name.

```railroad
col
```

## Signature

```typescript
col(name: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | The column's name, as the frame has it. |

## Returns

The column's values, of its type, named as the column.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | The frame has no column of that name (checked when the plan is built). |

## Notes

- Building `col('x')` checks nothing: the frame it is used in is known only later.
- In `groupBy(…).agg(…)`, `col` outside an aggregate reads a key.

## Examples

A column, and an expression of it:

```ts
const items = frame({ name: ['tea', 'cake'], price: [4.5, 3.25] });
items.select(col('name'), col('price').mul(2).alias('two'));
```

| name | two |
| --- | --- |
| tea | 9 |
| cake | 6.5 |

A name the frame doesn't have:

<!-- docs:error SMALTDF_SCHEMA -->
```ts
items.select(col('cost'));
```

## Demo

Columns by name:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ x: [1, 2], y: [10, 20] }).select(col('y'), col('x'));
```

| y | x |
| --- | --- |
| 10 | 1 |
| 20 | 2 |

## See also

[`lit`](./lit), [`alias`](./alias), [`select`](../frames/select)
