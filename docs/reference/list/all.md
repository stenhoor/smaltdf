# `list.all`

Whether every non-null element is true.

```railroad
list-all
```

## Signature

```typescript
expr.list.all(): Expr
```

## Returns

`bool`; true for a list with no non-null element, null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of `bool` values. |

## Examples

Of each list:

```ts
const checks = frame({ id: [1, 2, 3, 4], ok: [[true, true, null], [true, false], null, []] });
checks.select('ok', col('ok').list.all().alias('all'));
```

| ok | all |
| --- | --- |
| [true,true,null] | true |
| [true,false] | false |
| null | null |
| [] | true |

## Demo

Whether every step of a build passed:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ steps: [[true, true, true], [true, false]] }).select(col('steps').list.all().alias('passed'));
```

| passed |
| --- |
| true |
| false |

## See also

[`list.median`](./median), [`list.std`](./std), [`list.var`](./var), [`list.nUnique`](./nUnique), [`explode`](../frames/explode)
