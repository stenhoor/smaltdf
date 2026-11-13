# `list.shift`

The elements moved later (or earlier), nulls filling the places left.

```railroad
list-shift
```

## Signature

```typescript
expr.list.shift(n?: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `ExprLike` | How many places: later for positive, earlier for negative. Default 1. |

## Returns

A list of the same type and length; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list, or `n` isn't a whole number. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.shift().alias('later'), col('scores').list.shift(-1).alias('earlier'));
```

| scores | later | earlier |
| --- | --- | --- |
| [3,1,2] | [null,3,1] | [1,2,null] |
| [] | [] | [] |
| null | null | null |
| [5,null,5] | [null,5,null] | [null,5,null] |

## Demo

Each day's previous day:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ sales: [[10, 12, 9]] }).select(col('sales').list.shift().alias('previous'));
```

| previous |
| --- |
| [null,10,12] |

## See also

[`list.dropNulls`](./dropNulls), [`list.diff`](./diff), [`list.gather`](./gather), [`list.gatherEvery`](./gatherEvery), [`explode`](../frames/explode)
