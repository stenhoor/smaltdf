# `filter`

The rows where every predicate is true.

```railroad
filter
```

## Signature

```typescript
frame.filter(...predicates: Expr[]): Frame
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `predicates` | `Expr[]` | Conditions of type `bool`. A row is kept when all are true: not false and not null. |

## Returns

A frame with the same columns and the rows that pass, in the frame's order.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A predicate names a column the frame doesn't have. |
| `SMALTDF_TYPE` | A predicate isn't a `bool`, or is an aggregate without `over`. |

## Notes

- A null predicate drops the row: `col('qty').gt(4)` is null where `qty` is null.
- A window can filter: `col('qty').rank({ descending: true }).over('region').eq(1)` keeps the top row of each region.

## Examples

Two conditions, both true:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
orders.filter(col('qty').gt(4), col('price').lt(3));
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 2 | s | 12 | 1 |
| 5 | s | 5 | 2 |

Null tests keep or drop the null rows:

```ts
orders.filter(col('qty').isNull());
```

| id | region | qty | price |
| --- | --- | --- | --- |
| 4 | e | null | 3 |

A predicate must be a condition:

<!-- docs:error SMALTDF_TYPE -->
```ts
orders.filter(col('qty'));
```

## Demo

The rows that matter:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const tasks = frame({ title: ['write', 'test', 'ship'], done: [true, false, false], hours: [3, 5, null] });
tasks.filter(col('done').not(), col('hours').isNotNull());
```

| title | done | hours |
| --- | --- | --- |
| test | false | 5 |

## See also

[`sort`](../frames/sort), [`gt`](../expressions/gt), [`and`](../expressions/and), [`isNull`](../expressions/isNull)
