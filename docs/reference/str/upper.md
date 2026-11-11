# `str.upper`

The text in upper case, in every script.

```railroad
str-upper
```

## Signature

```typescript
expr.str.upper(): Expr
```

## Returns

`text`, or null for null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't text. |

## Notes

- A character can become several: `ß` is `SS`.

## Examples

Every script, not only ASCII:

```ts
const names = frame({ name: ['Ann', 'ÉMILE', 'straße', null] });
names.select('name', col('name').str.upper().alias('upper'));
```

| name | upper |
| --- | --- |
| Ann | ANN |
| ÉMILE | ÉMILE |
| straße | STRASSE |
| null | null |

## Demo

Codes in upper case:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ code: ['ab-1', 'Cd-2'] }).select(col('code').str.upper());
```

| code |
| --- |
| AB-1 |
| CD-2 |

## See also

[`str.lower`](./lower)
