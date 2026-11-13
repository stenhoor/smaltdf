# `list.sample`

Elements chosen at random.

```railroad
list-sample
```

## Signature

```typescript
expr.list.sample(n: number, options?: { withReplacement?: boolean; seed?: number }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `n` | `number` | How many elements. |
| `withReplacement` | `boolean` | Whether an element may be chosen more than once. Default `false`. |
| `seed` | `number` | A whole number: the same seed gives the same choice each time. |

## Returns

A list of the same type with `n` elements; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |
| `SMALTDF_RANGE` | `n` or `seed` is not a whole number. |
| `SMALT_RANGE` | Without replacement, `n` is more than the list has. |

## Notes

- Without replacement, the chosen elements keep the list's order; with replacement, they come in the order drawn.
- Without a seed, each run chooses again.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2], scores: [[3, 1, 2], [5, null, 5]] });
posts.select('scores', col('scores').list.sample(3).alias('all'), col('scores').list.sample(2, { seed: 1 }).list.len().alias('two'));
```

| scores | all | two |
| --- | --- | --- |
| [3,1,2] | [3,1,2] | 2 |
| [5,null,5] | [5,null,5] | 2 |

## Demo

Draw two cards; the seed makes the draw repeatable:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ deck: [['A', 'K', 'Q', 'J', '10']] }).select(col('deck').list.sample(2, { seed: 7 }).alias('hand'));
```

| hand |
| --- |
| ["A","K"] |

## See also

[`list.dropNulls`](./dropNulls), [`list.shift`](./shift), [`list.diff`](./diff), [`list.gather`](./gather), [`explode`](../frames/explode)
