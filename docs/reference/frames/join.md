# `join`

Rows of two frames matched on equal keys.

```railroad
join
```

## Signature

```typescript
frame.join(other: Frame, options?: { on?: string | string[]; leftOn?: …; rightOn?: …; how?: 'inner' | 'left' | 'right' | 'full' | 'semi' | 'anti' | 'cross'; suffix?: string; maintainOrder?: boolean }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `Frame` | The right side. |
| `on` | `string \\| string[]` | Key columns both sides have. |
| `leftOn, rightOn` | `Expr \\| string \\| (Expr \\| string)[]` | Keys of each side, instead of `on`: names or expressions. |
| `how` | `string` | `inner` (default), `left`, `right`, `full`, `semi`, `anti` or `cross`. |
| `suffix` | `string` | Added to a right column whose name the left side has. Default `_right`. |
| `maintainOrder` | `boolean` | The left side's order, each left row's matches in the right side's order. Default `false`. |

## Returns

A frame with the left columns, then the right's. Keys named by `on` appear once: the left side's, the right's
for `right`, and whichever side has one for `full`; with `leftOn` and `rightOn` both sides' keys stay. `semi` and `anti`
give the left columns only.

| `how` | Rows |
| --- | --- |
| `inner` | Each pair of matching rows |
| `left` | Those, and each left row without a match, with nulls for the right columns |
| `right` | Those, and each right row without a match, with nulls for the left columns |
| `full` | Both of the above |
| `semi` | The left rows that have a match, once each |
| `anti` | The left rows that have none |
| `cross` | Every left row with every right row; no keys |

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A key names a column a side doesn't have, or a suffixed name is taken too. |
| `SMALTDF_TYPE` | Keys of the two sides have types that don't compare, such as text and a number. |

## Notes

- A null key matches nothing.
- `semi` and `anti` keep the left side's order. The others give rows in no particular order unless `maintainOrder`.

## Examples

Orders with their region's name:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
const regions = frame({ region: ['n', 's', 'w'], name: ['North', 'South', 'West'] });
orders.join(regions, { on: 'region', how: 'left', maintainOrder: true }).select('id', 'region', 'name');
```

| id | region | name |
| --- | --- | --- |
| 1 | n | North |
| 2 | s | South |
| 3 | n | North |
| 4 | e | null |
| 5 | s | South |

Orders whose region has no name:

```ts
orders.join(regions, { on: 'region', how: 'anti' }).select('id', 'region');
```

| id | region |
| --- | --- |
| 4 | e |

## Demo

Customers and their orders:

```ts
import { frame } from '@smaltworks/smaltdf';

const customers = frame({ cid: [1, 2, 3], name: ['Ann', 'Bo', 'Cy'] });
const sales = frame({ cid: [1, 1, 3], total: [20, 5, 12] });
customers.join(sales, { on: 'cid', how: 'inner', maintainOrder: true });
```

| cid | name | total |
| --- | --- | --- |
| 1 | Ann | 20 |
| 1 | Ann | 5 |
| 3 | Cy | 12 |

## See also

[`joinAsof`](../frames/joinAsof), [`concat`](../frames/concat), [`Joins and concatenation`](../../guide/joins)
