# `isNull`

Whether the value is null. Never null itself.

```railroad
isNull
```

## Signature

```typescript
expr.isNull(): Expr
```

## Returns

A `bool`: true for null, false otherwise.

## Errors

None of its own.

## Notes

- NaN isn't null: it is a value of `real`.

## Examples

Each value:

```ts
frame({ x: [1, null, NaN] }).select('x', col('x').isNull().alias('missing'));
```

| x | missing |
| --- | --- |
| 1 | false |
| null | true |
| NaN | false |

## Demo

The rows with a gap:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ name: ['ann', 'bo'], email: ['a@x.org', null] }).filter(col('email').isNull());
```

| name | email |
| --- | --- |
| bo | null |

## See also

[`isNotNull`](./isNotNull), [`eqMissing`](./eqMissing)
