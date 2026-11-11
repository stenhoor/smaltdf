# `not`

The opposite of a condition: null stays null.

```railroad
not
```

## Signature

```typescript
expr.not(): Expr
```

## Returns

A `bool`: false for true, true for false, null for null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a `bool`. |

## Examples

Each value:

```ts
frame({ p: [true, false, null] }).select('p', col('p').not().alias('not_p'));
```

| p | not_p |
| --- | --- |
| true | false |
| false | true |
| null | null |

## Demo

Rows that don't match:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ name: ['ann', 'bo', 'cy'] }).filter(col('name').eq('bo').not());
```

| name |
| --- |
| ann |
| cy |

## See also

[`and`](./and), [`or`](./or), [`isNotNull`](./isNotNull)
