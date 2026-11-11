# `joinAsof`

Each left row with the right row whose key is nearest its own.

```railroad
joinAsof
```

## Signature

```typescript
frame.joinAsof(other: Frame, options: { on?: string; leftOn?: string | Expr; rightOn?: string | Expr; by?: string | string[]; strategy?: 'backward' | 'forward' | 'nearest'; tolerance?: number; suffix?: string }): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `Frame` | The right side. |
| `on` | `string` | The key column both sides have; or `leftOn` and `rightOn`. |
| `by` | `string \\| string[]` | Columns of both sides that must also be equal. |
| `strategy` | `string` | `backward` (default): the last right row at or before the key; `forward`: the first at or after it; `nearest`: the closest, ties to the smaller key. |
| `tolerance` | `number` | The largest distance between the keys. |
| `suffix` | `string` | Added to a right column whose name the left side has. Default `_right`. |

## Returns

A frame with the left columns, then the right's but its `on` and `by` columns, and one row per left row in the left order. Without a match, the right columns are null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A key or `by` column is missing from a side. |
| `SMALTDF_TYPE` | The keys aren't numbers, dates or times of one kind. |

## Examples

Each trade with the quote in force:

```ts
const trades = frame({ t: [2, 5, 9], sym: ['a', 'a', 'b'] });
const quotes = frame({ t: [1, 4, 8, 9], sym: ['a', 'a', 'b', 'a'], bid: [10, 11, 50, 12] });
trades.joinAsof(quotes, { on: 't', by: 'sym' });
```

| t | sym | bid |
| --- | --- | --- |
| 2 | a | 10 |
| 5 | a | 11 |
| 9 | b | 50 |

The nearest, but no further than 1:

```ts
trades.joinAsof(quotes, { on: 't', strategy: 'nearest', tolerance: 1 });
```

| t | sym | sym_right | bid |
| --- | --- | --- | --- |
| 2 | a | a | 10 |
| 5 | a | a | 11 |
| 9 | b | a | 12 |

## Demo

Readings and the calibration before each:

```ts
import { frame } from '@smaltworks/smaltdf';

const readings = frame({ at: [3, 7, 12], raw: [100, 104, 99] });
const calibration = frame({ at: [0, 6, 10], offset: [-2, 1, 0] });
readings.joinAsof(calibration, { on: 'at' });
```

| at | raw | offset |
| --- | --- | --- |
| 3 | 100 | -2 |
| 7 | 104 | 1 |
| 12 | 99 | 0 |

## See also

[`join`](../frames/join), [`sort`](../frames/sort)
