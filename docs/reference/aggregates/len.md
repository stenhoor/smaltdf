# `len`

The number of rows, nulls included. A function: `len()`.

```railroad
len
```

## Signature

```typescript
len(): Expr
```

## Returns

An `int`, named `len`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | It is used outside `agg`, a select of aggregates or `over`. |

## Notes

- [`count`](./count) counts a column's non-null values.

## Examples

Rows per group:

```ts
const sales = frame({ shop: ['a', 'a', 'b', 'b', 'c'], amt: [10, 30, 5, null, null] });
sales.groupBy('shop', { maintainOrder: true }).agg(len());
```

| shop | len |
| --- | --- |
| a | 2 |
| b | 2 |
| c | 1 |

All rows:

```ts
sales.select(len().alias('rows'));
```

| rows |
| --- |
| 5 |

On every row, the size of its partition:

```ts
sales.withColumns(len().over('shop').alias('in_shop'));
```

| shop | amt | in_shop |
| --- | --- | --- |
| a | 10 | 2 |
| a | 30 | 2 |
| b | 5 | 2 |
| b | null | 2 |
| c | null | 1 |

## Demo

How many of each:

```ts
import { frame, len } from '@smaltworks/smaltdf';

frame({ fruit: ['apple', 'pear', 'apple', 'apple'] }).groupBy('fruit', { maintainOrder: true }).agg(len().alias('n'));
```

| fruit | n |
| --- | --- |
| apple | 3 |
| pear | 1 |

## See also

[`count`](./count), [`groupBy`](../frames/groupBy), [`over`](../windows/over)
