# `or`

Whether either condition is true, with three-valued logic.

```railroad
or
```

## Signature

```typescript
expr.or(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | A `bool` expression or a boolean. |

## Returns

A `bool`: true when either is true (even if the other is null), null when one is null and the other false, false otherwise.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | An operand isn't a `bool`. |

## Examples

Every combination:

```ts
const truth = frame({ p: [true, true, false, null, null], q: [false, null, null, false, null] });
truth.select('p', 'q', col('p').or(col('q')).alias('p_or_q'));
```

| p | q | p_or_q |
| --- | --- | --- |
| true | false | true |
| true | null | true |
| false | null | null |
| null | false | null |
| null | null | null |

## Demo

Either condition:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ city: ['Oslo', 'Rome', 'Lima'], temp: [-3, 18, 22] }).filter(col('city').eq('Oslo').or(col('temp').gt(20)));
```

| city | temp |
| --- | --- |
| Oslo | -3 |
| Lima | 22 |

## See also

[`and`](./and), [`not`](./not)
