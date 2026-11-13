# `list.sort`

The elements sorted, nulls first (or last).

```railroad
list-sort
```

## Signature

```typescript
expr.list.sort(options?: { descending?: boolean; nullsLast?: boolean }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `descending` | `boolean` | Largest first. Default `false`. |
| `nullsLast` | `boolean` | Nulls after the values. Default `false`: first. |

## Returns

A list of the same type.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Notes

- Nulls come first in both directions, unless `nullsLast`.

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

Nulls last:

```ts
const withNulls = frame({ id: [1], scores: [[5, null, 3]] });
withNulls.select(col('scores').list.sort({ nullsLast: true }).alias('asc'), col('scores').list.sort({ descending: true, nullsLast: true }).alias('desc'));
```

| asc | desc |
| --- | --- |
| [3,5,null] | [5,3,null] |

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
