# `list.eval`

The list of an expression for each element.

```railroad
list-eval
```

## Signature

```typescript
expr.list.eval(expr: Expr): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `expr` | `Expr` | The body: an expression of [`element()`](./element), its [`position`](./position), and the row's columns. |

## Returns

A list of the body's type, in the list's order; `[]` for an empty list, null for a null list.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a list; the body has an aggregate (use [`list.agg`](./agg)) or a window. |

## Notes

- The engine runs the body per element in one pass over each list: no rows are made, and nothing is regrouped.
- Unlike Polars' `eval`, a body may read the row's columns with `col`.
- Bodies nest: a body may hold a `list.eval` of its own, where [`element(1)`](./element) is the outer element.

## Examples

Of each list:

```ts
const posts = frame({ id: [1, 2, 3, 4], scores: [[3, 1, 2], [], null, [5, null, 5]] });
posts.select('scores', col('scores').list.eval(element().mul(10)).alias('x10'), col('scores').list.eval(element().gt(2)).alias('high'));
```

| scores | x10 | high |
| --- | --- | --- |
| [3,1,2] | [30,10,20] | [true,false,false] |
| [] | [] | [] |
| null | null | null |
| [5,null,5] | [50,null,50] | [true,null,true] |

## Demo

Names, tidied:

```ts
import { col, element, frame } from '@smaltworks/smaltdf';

frame({ tags: [['Rust', 'GO', 'ts']] }).select(col('tags').list.eval(element().str.lower()));
```

| tags |
| --- |
| ["rust","go","ts"] |

## See also

[`element`](./element), [`list.filter`](./filter), [`list.agg`](./agg), [`explode`](../frames/explode)
