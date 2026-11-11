# `gt`

Whether the value is greater than the other.

```railroad
gt
```

## Signature

```typescript
expr.gt(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | An expression or a JavaScript value to compare with. |

## Returns

A `bool`: true or false, or null when either operand is null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The operands don't compare: a number and text, for example. |
| `SMALT_MISMATCH` | Text compared with a date or datetime isn't one. |

## Notes

- Numbers compare with numbers, text with text (by code point), blobs with blobs, and each date and time type with itself.
- Text compared with a `date` or `datetime` is read as one: `col('day').ge('2026-01-01')`.
- NaN equals NaN and is greater than every other number, as it sorts.

## Examples

Each row compared:

```ts
const nums = frame({ a: [7, -7, 5, null], b: [2, 2, 0.5, 3] });
nums.select('a', 'b', col('a').gt(col('b')).alias('result'));
```

| a | b | result |
| --- | --- | --- |
| 7 | 2 | true |
| -7 | 2 | false |
| 5 | 0.5 | true |
| null | 3 | null |

In a filter:

```ts
nums.filter(col('a').gt(5));
```

| a | b |
| --- | --- |
| 7 | 2 |

## Demo

Comparing text:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const names = frame({ name: ['ann', 'Bo', 'cy'] });
names.select('name', col('name').gt('bo').alias('result'));
```

| name | result |
| --- | --- |
| ann | false |
| Bo | false |
| cy | true |

## See also

[`eq`](./eq), [`ne`](./ne), [`lt`](./lt), [`le`](./le), [`ge`](./ge), [`eqMissing`](./eqMissing), [`filter`](../frames/filter)
