# `str.lower`

The text in lower case, in every script.

```railroad
str-lower
```

## Signature

```typescript
expr.str.lower(): Expr
```

## Returns

`text`, or null for null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't text. |

## Examples

Every script, not only ASCII:

```ts
const names = frame({ name: ['Ann', 'ÉMILE', 'straße', null] });
names.select('name', col('name').str.lower().alias('lower'));
```

| name | lower |
| --- | --- |
| Ann | ann |
| ÉMILE | émile |
| straße | straße |
| null | null |

## Demo

Case-insensitive matching:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ tag: ['News', 'NEWS', 'sport'] }).filter(col('tag').str.lower().eq('news'));
```

| tag |
| --- |
| News |
| NEWS |

## See also

[`str.upper`](./upper), [`str.contains`](./contains)
