# `implode`

The group's values as a list, in the group's order, nulls included.

```railroad
implode
```

## Signature

```typescript
expr.implode(): Expr
```

## Returns

A `list<T>`, where `T` is the column's type: one element per row of the group, nulls included.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Notes

- [`explode`](../frames/explode) undoes it.

## Examples

Per group: shop `c` has no values.

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(col('amt').implode());
```

| shop | amt |
| --- | --- |
| a | [10,30] |
| b | [5,null] |
| c | [null] |

Over every row:

```ts
sales.select(col('amt').implode());
```

| amt |
| --- |
| [10,30,5,null,null] |

## Demo

Each customer's orders as a list:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ who: ['ann', 'bo', 'ann'], item: ['tea', 'jam', 'cake'] }).groupBy('who', { maintainOrder: true }).agg(col('item').implode());
```

| who | item |
| --- | --- |
| ann | ["tea","cake"] |
| bo | ["jam"] |

## See also

[`sum`](./sum), [`mean`](./mean), [`min`](./min), [`max`](./max), [`count`](./count), [`groupBy`](../frames/groupBy)
