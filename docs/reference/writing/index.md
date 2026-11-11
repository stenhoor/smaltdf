# Writing and views

Frames can write: insert their rows into a table, make a table, or be stored by name as a view. `update` and
`deleteFrom` change a table's rows. Each write runs at once, in one transaction, and resolves to the number of rows it
wrote, changed or deleted.

```ts
import { col, deleteFrom, frame, table, update } from '@smaltworks/smaltdf';
```

## Methods {#methods}

### Tables

- [`createTable`](./createTable): Makes a table with the frame's columns and types, and writes its rows into it.
- [`insertInto`](./insertInto): Writes the frame's rows into a table, by column name.
- [`update`](./update): Sets columns of a table in the rows a condition is true for.
- [`deleteFrom`](./deleteFrom): Deletes the rows of a table a condition is true for.

### Views

- [`createView`](./createView): Stores the frame by name, as a view that reads as a table.
- [`refreshView`](./refreshView): Runs a materialized view again and keeps its new rows.
- [`dfLanguage`](./dfLanguage): smaltdf as a language of the engine: register it where the engine runs, to read smaltdf's views.

## Rules they share

- **One transaction:** a write that fails undoes all of it.
- **Columns fit by type:** `int` fits an `INTEGER`, `REAL` or `NUMERIC` column, `bool` those or a `BOOLEAN` one,
  `real` a `REAL` or `NUMERIC` one, `text` a `TEXT` one, `blob` a `BLOB` one, each date and time type its own, a list
  or struct a column of the same type, and anything an `ANY` column.
- **Views need smaltdf registered** where the engine runs: `registerLanguage(dfLanguage)` in process, or
  `defineWorker({ languages: [dfLanguage] })` in a worker entry ([`dfLanguage`](./dfLanguage)).
