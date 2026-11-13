# `list.dropNulls`

The non-null elements.

```railroad
list-dropNulls
```

## Signature

```typescript
expr.list.dropNulls(): Expr
```

## Returns

A list of the same type; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.dropNulls().alias('known'));
```

| scores | known |
| --- | --- |
| [3,1,2] | [3,1,2] |
| [] | [] |
| null | null |
| [5,null,5] | [5,5] |

## Demo

The addresses that were given:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ emails: [['a@x.io', null, 'b@x.io']] }).select(col('emails').list.dropNulls());
```

| emails |
| --- |
| ["a@x.io","b@x.io"] |

## See also

[`list.shift`](./shift), [`list.diff`](./diff), [`list.gather`](./gather), [`list.gatherEvery`](./gatherEvery), [`explode`](../frames/explode)
