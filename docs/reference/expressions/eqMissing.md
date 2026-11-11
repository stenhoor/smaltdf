# `eqMissing`

Equality where null equals null: never null itself.

```railroad
eqMissing
```

## Signature

```typescript
expr.eqMissing(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | An expression or a JavaScript value to compare with. |

## Returns

A `bool`: true when both are equal or both are null, false otherwise.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The operands don't compare. |

## Examples

Compared with `eq`:

```ts
const pairs = frame({ a: [1, null, null], b: [1, 2, null] });
pairs.select('a', 'b', col('a').eq(col('b')).alias('eq'), col('a').eqMissing(col('b')).alias('eqMissing'));
```

| a | b | eq | eqMissing |
| --- | --- | --- | --- |
| 1 | 1 | true | true |
| null | 2 | null | false |
| null | null | null | true |

## Demo

Rows that changed, nulls included:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const diff = frame({ before: ['x', null, 'y'], after: ['x', 'z', null] });
diff.filter(col('before').eqMissing(col('after')).not());
```

| before | after |
| --- | --- |
| null | z |
| y | null |

## See also

[`eq`](./eq), [`isNull`](./isNull)
