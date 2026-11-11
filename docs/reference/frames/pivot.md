# `pivot`

One row per `index` value and one column per value of `on`, each cell an aggregate of `values`.

```railroad
pivot
```

## Signature

```typescript
frame.pivot(on: string, options: { index: string | string[]; values: string; aggregate?: 'first' | 'last' | 'sum' | 'mean' | 'min' | 'max' | 'count' | 'len' | 'median'; columns?: (number | bigint | string | null)[]; maintainOrder?: boolean }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `on` | `string` | The column whose values become columns. |
| `index` | `string \\| string[]` | The column or columns that make the rows. |
| `values` | `string` | The column the cells aggregate. |
| `aggregate` | `string` | How a cell combines its rows. Default `first`. |
| `columns` | `value[]` | The values of `on` to make columns of, in order. Without it, they are read from the frame before it runs, sorted. |
| `maintainOrder` | `boolean` | Give the rows in order of first appearance. Default `false`. |

## Returns

A frame with the `index` columns, then one column per value of `on`, named by it (`null` for a null value). A cell with no rows is null, or 0 for `sum` and `count`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | `on`, `index` or `values` names a column the frame doesn't have. |
| `SMALTDF_TYPE` | The aggregate doesn't take the `values` column's type, such as `sum` of text. |

## Notes

- Without `columns`, the pivot runs a query first to find the values of `on`. A view keeps the columns it had when it was made.

## Examples

Scores per student and subject:

```ts
const scores = frame({ name: ['ann', 'ann', 'bo', 'bo', 'bo'], subject: ['math', 'art', 'math', 'art', 'math'], score: [90, 70, 60, 80, 70] });
scores.pivot('subject', { index: 'name', values: 'score', aggregate: 'max', maintainOrder: true });
```

| name | art | math |
| --- | --- | --- |
| ann | 70 | 90 |
| bo | 80 | 70 |

Named columns, in an order of your own:

```ts
scores.pivot('subject', { index: 'name', values: 'score', aggregate: 'count', columns: ['math', 'art', 'music'], maintainOrder: true });
```

| name | math | art | music |
| --- | --- | --- | --- |
| ann | 1 | 1 | 0 |
| bo | 2 | 1 | 0 |

## Demo

Sales per month, wide:

```ts
import { frame } from '@smaltworks/smaltdf';

const monthly = frame({ shop: ['a', 'a', 'b', 'b'], month: ['jan', 'feb', 'jan', 'feb'], sales: [5, 7, 3, 9] });
monthly.pivot('month', { index: 'shop', values: 'sales', aggregate: 'sum', columns: ['jan', 'feb'], maintainOrder: true });
```

| shop | jan | feb |
| --- | --- | --- |
| a | 5 | 7 |
| b | 3 | 9 |

## See also

[`unpivot`](../frames/unpivot), [`groupBy`](../frames/groupBy), [`Reshaping`](../../guide/reshaping)
