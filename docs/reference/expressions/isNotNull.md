# `isNotNull`

Whether the value is not null. Never null itself.

```railroad
isNotNull
```

## Signature

```typescript
expr.isNotNull(): Expr
```

## Returns

A `bool`: false for null, true otherwise.

## Errors

None of its own.

## Examples

Each value:

```ts
frame({ x: ['a', null] }).select('x', col('x').isNotNull().alias('present'));
```

| x | present |
| --- | --- |
| a | true |
| null | false |

## Demo

The complete rows:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ name: ['ann', 'bo', null], age: [34, null, 50] }).filter(col('name').isNotNull(), col('age').isNotNull());
```

| name | age |
| --- | --- |
| ann | 34 |

## See also

[`isNull`](./isNull), [`filter`](../frames/filter)
