# `list.var`

The variance of the non-null elements.

```railroad
list-var
```

## Signature

```typescript
expr.list.var(ddof?: number): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `ddof` | `number` | Degrees of freedom taken away: 1 (default) for a sample, 0 for the whole population. |

## Returns

`real`; null for a null list, or one with no more numbers than `ddof`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list of numbers. |
| `SMALTDF_RANGE` | `ddof` is not a whole number. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.var().alias('sample'), col('scores').list.var(0).alias('population'));
```

| scores | sample | population |
| --- | --- | --- |
| [3,1,2] | 1 | 0.6666666666666666 |
| [] | null | null |
| null | null | null |
| [5,null,5] | 0 | 0 |

## Demo

The variance of readings:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ readings: [[9.5, 10.5, 10, 10]] }).select(col('readings').list.var().alias('variance'));
```

| variance |
| --- |
| 0.16666666666666666 |

## See also

[`list.median`](./median), [`list.std`](./std), [`list.nUnique`](./nUnique), [`list.argMin`](./argMin), [`explode`](../frames/explode)
