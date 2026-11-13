# `position`

The position of [`element()`](./element) in its list, from 0.

```railroad
position
```

## Signature

```typescript
element(depth?).position(): Expr
```

## Returns

An `int`.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | It is called on anything but `element()`. |

## Notes

- Polars has no element position; its `int_range(len())` gives the same numbers.

## Examples

Elements with their positions:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.eval(element().position()).alias('at'), col('scores').list.filter(element().position().ge(1)).alias('rest'));
```

| scores | at | rest |
| --- | --- | --- |
| [3,1,2] | [0,1,2] | [1,2] |
| [] | [] | [] |
| null | null | null |
| [5,null,5] | [0,1,2] | [null,5] |

## Demo

Every other reading, from the first:

```ts
import { col, element, frame } from '@smaltworks/smaltdf';

frame({ readings: [[7, 9, 8, 6, 5]] }).select(col('readings').list.filter(element().position().mod(2).eq(0)).alias('sampled'));
```

| sampled |
| --- |
| [7,8,5] |

## See also

[`element`](./element), [`list.eval`](./eval), [`list.filter`](./filter), [`list.gatherEvery`](./gatherEvery)
