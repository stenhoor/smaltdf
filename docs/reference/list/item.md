# `list.item`

The one element of a list of one.

```railroad
list-item
```

## Signature

```typescript
expr.list.item(): Expr
```

## Returns

Of the element type; null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list. |
| `SMALT_RANGE` | The list has no element, or more than one. |

## Examples

Of each list:

```ts
const answers = frame({ id: [1, 2, 3], v: [[7], [null], null] });
answers.select('v', col('v').list.item().alias('item'));
```

| v | item |
| --- | --- |
| [7] | 7 |
| [null] | null |
| null | null |

## Demo

A list that holds one value, as that value:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ owner: [['ana'], ['bo']] }).select(col('owner').list.item());
```

| owner |
| --- |
| ana |
| bo |

## See also

[`list.dropNulls`](./dropNulls), [`list.shift`](./shift), [`list.diff`](./diff), [`list.gather`](./gather), [`explode`](../frames/explode)
