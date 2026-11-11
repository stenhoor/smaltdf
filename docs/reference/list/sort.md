# `list.sort`

The elements sorted, nulls first.

```railroad
list-sort
```

## Signature

```typescript
expr.list.sort(options?: { descending?: boolean }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `descending` | `boolean` | Largest first. Default `false`. |

## Returns

A list of the same type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Notes

- Nulls come first in both directions.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.sort().alias('asc'), col('scores').list.sort({ descending: true }).alias('desc'));
```

| scores | asc | desc |
| --- | --- | --- |
| [3,1,2] | [1,2,3] | [3,2,1] |
| [] | [] | [] |
| null | null | null |
| [5,null,5] | [null,5,5] | [null,5,5] |

## Demo

Tags in order:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ tags: [['zeta', 'alpha', 'mu']] }).select(col('tags').list.sort());
```

| tags |
| --- |
| ["alpha","mu","zeta"] |

## See also

[`list.len`](./len), [`list.get`](./get), [`list.slice`](./slice), [`list.sum`](./sum), [`explode`](../frames/explode)
