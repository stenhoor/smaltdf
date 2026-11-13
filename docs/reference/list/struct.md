# `struct`

A struct of named values.

```railroad
struct
```

## Signature

```typescript
struct(fields: { [name: string]: ExprLike }): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `fields` | `object` | Each field's name and value: an expression or a value. Names are letters, digits and `_`. |

## Returns

A `struct<name T, …>`, the fields in the order given. A field of a null value is null; the struct itself is never null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | No field is given. |
| `SMALTDF_RANGE` | A name isn't letters, digits and `_`. |

## Examples

```ts
const people = frame({ name: ['ana', 'bo'], age: [31, 42] });
people.select(struct({ name: col('name'), next: col('age').add(1) }).alias('person'));
```

| person |
| --- |
| {"name":"ana","next":32} |
| {"name":"bo","next":43} |

## Demo

A point from two columns:

```ts
import { col, frame, struct } from '@smaltworks/smaltdf';

frame({ x: [1, 2], y: [3.5, 4] }).select(struct({ x: col('x'), y: col('y') }).alias('pt'));
```

| pt |
| --- |
| {"x":1,"y":3.5} |
| {"x":2,"y":4} |

## See also

[`struct.field`](./field), [`struct.withFields`](./withFields), [`concatList`](./concatList), [`unnest`](../frames/unnest)
