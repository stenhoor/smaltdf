# `list.any`

Whether any non-null element is true.

```railroad
list-any
```

## Signature

```typescript
expr.list.any(): Expr
```

## Returns

`bool`; false for a list with no non-null element, null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of `bool` values. |

## Examples

Of each list:

```ts
const checks = frame({ id: [1, 2, 3, 4], ok: [[true, true, null], [true, false], null, []] });
checks.select('ok', col('ok').list.any().alias('any'));
```

| ok | any |
| --- | --- |
| [true,true,null] | true |
| [true,false] | true |
| null | null |
| [] | false |

## Demo

Whether a host raised any alert:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ alerts: [[false, false], [false, true]] }).select(col('alerts').list.any().alias('alerted'));
```

| alerted |
| --- |
| false |
| true |

## See also

[`list.median`](./median), [`list.std`](./std), [`list.var`](./var), [`list.nUnique`](./nUnique), [`explode`](../frames/explode)
