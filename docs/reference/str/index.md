# Text (str)

The methods of `expr.str` work on text: case, patterns, and reading dates. A null value gives null.

```ts
import { col } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Case

- [`str.lower`](./lower): The text in lower case, in every script.
- [`str.upper`](./upper): The text in upper case, in every script.

### Patterns

- [`str.contains`](./contains): Whether a regular expression matches anywhere in the text.

### Dates

- [`str.toDate`](./toDate): Text read as a `date`: in the result format, or with a `strftime` format.
- [`str.toDatetime`](./toDatetime): Text read as a `datetime`: in the result format, or with a `strftime` format.

## Rules they share

- **Text only:** each takes a `text` value; anything else is an error when the plan is built (`SMALTDF_TYPE`).
- **Unicode:** case mapping and patterns work on code points, in every script.
