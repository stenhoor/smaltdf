# `list.countMatches`

The number of elements equal to a value.

```railroad
list-countMatches
```

## Signature

```typescript
expr.list.countMatches(item: ExprLike): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `item` | `ExprLike` | The value to count; null counts the null elements. |

## Returns

`int`; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list, or `item` isn't of its element type. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.countMatches(5).alias('fives'), col('scores').list.countMatches(null).alias('nulls'));
```

| scores | fives | nulls |
| --- | --- | --- |
| [3,1,2] | 0 | 0 |
| [] | 0 | 0 |
| null | null | null |
| [5,null,5] | 2 | 1 |

## Demo

How many answered yes:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ answers: [['yes', 'no', 'yes', 'yes']] }).select(col('answers').list.countMatches('yes').alias('yes'));
```

| yes |
| --- |
| 3 |

## See also

[`list.median`](./median), [`list.std`](./std), [`list.var`](./var), [`list.nUnique`](./nUnique), [`explode`](../frames/explode)
