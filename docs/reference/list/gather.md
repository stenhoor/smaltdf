# `list.gather`

The elements at a list of positions.

```railroad
list-gather
```

## Signature

```typescript
expr.list.gather(indices: ExprLike, options?: { nullOnOob?: boolean }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `indices` | `ExprLike` | A list of positions, from 0; negative from the end. |
| `nullOnOob` | `boolean` | A position out of range gives null (default `true`); `false` makes it an error. |

## Returns

A list of the same type, one element per position; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list, or `indices` isn't a list of whole numbers. |
| `SMALT_RANGE` | A position is out of range and `nullOnOob` is `false`. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]], picks: [[0, -1], [0], [1], [2]] });
posts.select('scores', col('scores').list.gather(col('picks')).alias('picked'));
```

| scores | picked |
| --- | --- |
| [3,1,2] | [3,2] |
| [] | [null] |
| null | null |
| [5,null,5] | [5] |

## Demo

The first and last step:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ steps: [['plan', 'build', 'test', 'ship']], keep: [[0, -1]] }).select(col('steps').list.gather(col('keep')).alias('ends'));
```

| ends |
| --- |
| ["plan","ship"] |

## See also

[`list.dropNulls`](./dropNulls), [`list.shift`](./shift), [`list.diff`](./diff), [`list.gatherEvery`](./gatherEvery), [`explode`](../frames/explode)
