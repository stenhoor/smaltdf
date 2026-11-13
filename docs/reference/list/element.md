# `element`

The element of the list a [`list.eval`](./eval), [`list.filter`](./filter) or [`list.agg`](./agg) runs over.

```railroad
element
```

## Signature

```typescript
element(depth?: number): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `depth` | `number` | Which list, when bodies nest: 0 (default) the innermost, 1 the one around it, and so on. |

## Returns

An expression of the list's element type. [`position`](./position) gives its position instead.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | It is outside a `list.eval`, `list.filter` or `list.agg` body, or `depth` reaches past the outermost list. In a `list.agg` body, it is outside an aggregate. |
| `SMALTDF_RANGE` | `depth` is not a whole number of 0 or more. |

## Notes

- A body also reads the row's columns with `col`, so an element can be compared with its row's values.
- With nested bodies, `element()` is the inner list's element and `element(1)` the outer list's.

## Examples

Each element, its row's `k`, and the list around it:

```ts
const nested = frame({ k: [10, 20], groups: [[[1, 2], [3]], [[4]]] });
nested.select(col('groups').list.eval(element().list.eval(element().add(col('k')).add(element(1).list.len()))).alias('shifted'));
```

| shifted |
| --- |
| [[13,14],[14]] |
| [[25]] |

## Demo

Prices with each row's tax rate:

```ts
import { col, element, frame } from '@smaltworks/smaltdf';

frame({ rate: [0.2, 0.1], prices: [[10, 25], [8]] }).select(col('prices').list.eval(element().mul(col('rate').add(1))).alias('gross'));
```

| gross |
| --- |
| [12,30] |
| [8.8] |

## See also

[`position`](./position), [`list.eval`](./eval), [`list.filter`](./filter), [`list.agg`](./agg)
