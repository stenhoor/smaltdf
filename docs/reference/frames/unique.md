# `unique`

One row per distinct value of some columns: the first or the last of each.

```railroad
unique
```

## Signature

```typescript
frame.unique(options?: { subset?: string | string[]; keep?: 'first' | 'last'; maintainOrder?: boolean }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `subset` | `string \\| string[]` | The columns that make rows the same. Default: all of them. |
| `keep` | `'first' \\| 'last'` | Which row of each to keep, in the frame's order. Default `first`. |
| `maintainOrder` | `boolean` | Give the rows in order of each group's first row. Default `false`: no particular order. |

## Returns

A frame with the same columns and one row per distinct value of `subset`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | `subset` names a column the frame doesn't have. |

## Notes

- Nulls are equal to each other here: two rows with null in a `subset` column are the same.
- With `keep: 'last'` and `maintainOrder`, rows come in order of each group's first row: see [Compared with Polars](../../guide/polars).

## Examples

One row per region, the first of each:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.unique({ subset: 'region', maintainOrder: true });
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 1 | n | 3 | 2.5 |
| 2 | s | 12 | 1 |
| 4 | e | null | 3 |

The last of each:

```ts
orders.unique({ subset: 'region', keep: 'last', maintainOrder: true });
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 3 | n | 7 | 4 |
| 5 | s | 5 | 2 |
| 4 | e | null | 3 |

## Demo

Distinct values:

```ts
import { frame } from '@smaltworks/smaltdf';

frame({ tag: ['red', 'blue', 'red', 'green', 'blue'] }).unique({ maintainOrder: true });
```

| tag |
| --- |
| red |
| blue |
| green |

## See also

[`groupBy`](../frames/groupBy), [`filter`](../frames/filter)
