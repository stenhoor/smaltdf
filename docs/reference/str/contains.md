# `str.contains`

Whether a regular expression matches anywhere in the text.

```railroad
str-contains
```

## Signature

```typescript
expr.str.contains(pattern: string): Expr
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `pattern` | `string` | A regular expression, in JavaScript's syntax with the `u` flag. It matches anywhere unless anchored with `^` or `$`. |

## Returns

A `bool`, or null for null.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_TYPE` | The value isn't text. |
| `SMALT_ERROR` | The pattern isn't a valid regular expression. |

## Notes

- For a literal string, escape the characters that mean something in a pattern: `\\.` for a dot.
- Matching is case-sensitive; `(?i)` isn't supported: lower the text first with [`str.lower`](./lower).

## Examples

Anywhere, or anchored:

```ts
const files = frame({ path: ['a/report.pdf', 'b/data.csv', 'report.txt'] });
files.select('path', col('path').str.contains('report').alias('report'), col('path').str.contains('^report').alias('starts'), col('path').str.contains('\\.csv$').alias('csv'));
```

| path | report | starts | csv |
| --- | --- | --- | --- |
| a/report.pdf | true | false | false |
| b/data.csv | false | false | true |
| report.txt | true | true | false |

An invalid pattern:

<!-- docs:error SMALT_ERROR -->
```ts
files.filter(col('path').str.contains('('));
```

## Demo

Rows that mention an error:

```ts
import { col, frame } from '@smaltworks/smaltdf';

frame({ line: ['ok: started', 'error: disk full', 'warn: slow', 'Error: retry'] }).filter(col('line').str.lower().str.contains('^error'));
```

| line |
| --- |
| error: disk full |
| Error: retry |

## See also

[`str.lower`](./lower), [`filter`](../frames/filter)
