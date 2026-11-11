# `alias`

The same expression under another name.

```railroad
alias
```

## Signature

```typescript
expr.alias(name: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | The column's name in the result. |

## Returns

The expression's values, named `name`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | Two columns of a `select` or `agg` end up with one name. |

## Examples

Naming computed columns:

```ts
const items = frame({ price: [4.5, 3.25], qty: [2, 4] });
items.select(col('price').mul(col('qty')).alias('total'), col('qty').alias('count'));
```

| total | count |
| --- | --- |
| 9 | 2 |
| 13 | 4 |

## Demo

Renaming a column:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ nm: ['ann', 'bo'] }).select(col('nm').alias('name'));
```

| name |
| --- |
| ann |
| bo |

## See also

[`select`](../frames/select), [`withColumns`](../frames/withColumns)
