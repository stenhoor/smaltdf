# `unpivot`

Columns to rows: for each row, one row per column of `on`, with its name and its value.

```railroad
unpivot
```

## Signature

```typescript
frame.unpivot(options?: { index?: string | string[]; on?: string | string[]; variableName?: string; valueName?: string }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `index` | `string \\| string[]` | Columns kept as they are on every row. Default: those `on` doesn't name. |
| `on` | `string \\| string[]` | Columns turned into rows. Default: those `index` doesn't name. |
| `variableName` | `string` | The name of the column of column names. Default `variable`. |
| `valueName` | `string` | The name of the column of values. Default `value`. |

## Returns

A frame with the `index` columns, then the name column (`text`), then the value column, whose type the `on` columns share (`any` if they differ). Rows come in the frame's order, then the columns' order.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | `index` or `on` names a column the frame doesn't have. |

## Notes

- A null value gives a row too.

## Examples

A wide table, long:

```ts
const wide = frame({ id: [1, 2], q1: [10, 20], q2: [11, null] });
wide.unpivot({ index: 'id', variableName: 'quarter', valueName: 'sales' });
```

| id | quarter | sales |
| --- | --- | --- |
| 1 | q1 | 10 |
| 1 | q2 | 11 |
| 2 | q1 | 20 |
| 2 | q2 | null |

## Demo

Measurements to rows:

```ts
import { frame } from '@smaltworks/smaltdf';

frame({ day: ['mon', 'tue'], low: [3, 5], high: [11, 14] }).unpivot({ index: 'day' });
```

| day | variable | value |
| --- | --- | --- |
| mon | low | 3 |
| mon | high | 11 |
| tue | low | 5 |
| tue | high | 14 |

## See also

[`pivot`](../frames/pivot), [`explode`](../frames/explode)
