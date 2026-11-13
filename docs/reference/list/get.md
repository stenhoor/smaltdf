# `list.get`

The element at a position, or null out of range.

```railroad
list-get
```

## Signature

```typescript
expr.list.get(index: ExprLike, options?: { nullOnOob?: boolean }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `index` | `ExprLike` | The position, from 0; negative from the end. A value or an `int` expression. |
| `nullOnOob` | `boolean` | A position out of range gives null (default `true`); `false` makes it an error. |

## Returns

The element, of the list's element type; null when the position is out of range.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |
| `SMALT_RANGE` | The position is out of range and `nullOnOob` is `false`. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.get(1).alias('second'), col('scores').list.get(-1).alias('last'));
```

| scores | second | last |
| --- | --- | --- |
| [3,1,2] | 1 | 2 |
| [] | null | null |
| null | null | null |
| [5,null,5] | null | 5 |

Out of range is an error with `nullOnOob: false`:

<!-- docs:error SMALT_RANGE -->
```ts
frame({ v: [[1, 2]] }).select(col('v').list.get(5, { nullOnOob: false }));
```

## Demo

The second item of each order:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ items: [['tea', 'jam'], ['cake']] }).select(col('items').list.get(1).alias('second'));
```

| second |
| --- |
| jam |
| null |

## See also

[`list.len`](./len), [`list.slice`](./slice), [`list.sort`](./sort), [`list.sum`](./sum), [`explode`](../frames/explode)
