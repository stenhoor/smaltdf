# `and`

Whether both conditions are true, with three-valued logic.

```railroad
and
```

## Signature

```typescript
expr.and(other: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `other` | `ExprLike` | A `bool` expression or a boolean. |

## Returns

A `bool`: false when either is false (even if the other is null), null when one is null and the other true, true otherwise.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | An operand isn't a `bool`. |

## Notes

- `filter` with several predicates is the same as one `and` of them.

## Examples

Every combination:

```ts
const truth = frame({ p: [true, true, false, null, null], q: [true, null, null, false, null] });
truth.select('p', 'q', col('p').and(col('q')).alias('p_and_q'));
```

| p | q | p_and_q |
| --- | --- | --- |
| true | true | true |
| true | null | null |
| false | null | false |
| null | false | false |
| null | null | null |

## Demo

Two conditions:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ age: [15, 30, 70], member: [true, true, false] }).filter(col('age').ge(18).and(col('member')));
```

| age | member |
| --- | --- |
| 30 | true |

## See also

[`or`](./or), [`not`](./not), [`filter`](../frames/filter)
