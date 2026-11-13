# `struct.jsonEncode`

The struct as JSON text.

```railroad
struct-jsonEncode
```

## Signature

```typescript
expr.struct.jsonEncode(): Expr
```

## Returns

`text`: `{"x":1,"y":2.5}`, nested lists and structs as JSON arrays and objects; null for a null struct.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't a struct. |

## Examples

```ts
const points = frame({ id: [1, 2, 3], pt: [{ x: 1, y: 2.5 }, { x: 3, y: null }, null] });
points.select(col('pt').struct.jsonEncode().alias('json'));
```

| json |
| --- |
| {"x":1,"y":2.5} |
| {"x":3,"y":null} |
| null |

## Demo

A record as a message body:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ msg: [{ to: 'ana', tags: ['a', 'b'] }] }).select(col('msg').struct.jsonEncode());
```

| msg |
| --- |
| {"to":"ana","tags":["a","b"]} |

## See also

[`struct`](./struct), [`cast`](../expressions/cast)
