# `list.std`

The standard deviation of the non-null elements.

```railroad
list-std
```

## Signature

```typescript
expr.list.std(ddof?: number): Expr
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
posts.select('scores', col('scores').list.std().alias('sample'), col('scores').list.std(0).alias('population'));
```

| scores | sample | population |
| --- | --- | --- |
| [3,1,2] | 1 | 0.816496580927726 |
| [] | null | null |
| null | null | null |
| [5,null,5] | 0 | 0 |

## Demo

How much readings vary:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ readings: [[9.5, 10.5, 10, 10]] }).select(col('readings').list.std().alias('spread'));
```

| spread |
| --- |
| 0.408248290463863 |

## See also

[`list.median`](./median), [`list.var`](./var), [`list.nUnique`](./nUnique), [`list.argMin`](./argMin), [`explode`](../frames/explode)
