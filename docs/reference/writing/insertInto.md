# `insertInto`

Writes the frame's rows into a table, by column name.

```railroad
insertInto
```

## Signature

```typescript
frame.insertInto(db: Db, table: string, options?: { onConflict?: 'abort' | 'ignore' | 'replace' }): Promise<{ rows: number }>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `db` | `Db` | The database. |
| `table` | `string` | The table to write into. |
| `onConflict` | `'abort' \\| 'ignore' \\| 'replace'` | A row that breaks a constraint: undo the whole write (`abort`, the default), skip the row (`ignore`), or replace the row it conflicts with (`replace`). |

## Returns

A promise of `{ rows }`: the number of rows written.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | The table doesn't exist, or has no column of a frame column's name. |
| `SMALTDF_TYPE` | A frame column doesn't fit its table column. |
| `SMALT_CONSTRAINT_…` | A row breaks a constraint (`SMALT_CONSTRAINT_UNIQUE`, `_PRIMARYKEY`, `_NOTNULL`, `_CHECK` or `_FOREIGNKEY`), with `onConflict: 'abort'`. |

## Notes

- The table's other columns take their defaults.

## Examples

Rows added to a table:

```ts
await frame({ id: [1], name: ['cup'] }).createTable(db, 'items');
await frame({ id: [2, 3], name: ['mug', 'jar'] }).insertInto(db, 'items');
```

| rows |
| --- |
| 2 |

Read back:

```ts
table('items');
```

| id | name |
| --- | --- |
| 1 | cup |
| 2 | mug |
| 3 | jar |

A column that doesn't fit:

<!-- docs:error SMALTDF_TYPE -->
```ts
await frame({ id: ['four'] }).insertInto(db, 'items');
```

## Demo

A log, appended to:

```ts
import { frame, table } from '@smaltworks/smaltdf';

await frame({ at: [1], msg: ['start'] }).createTable(db, 'log');
await frame({ at: [2], msg: ['stop'] }).insertInto(db, 'log');
table('log');
```

| at | msg |
| --- | --- |
| 1 | start |
| 2 | stop |

## See also

[`createTable`](./createTable), [`update`](./update)
