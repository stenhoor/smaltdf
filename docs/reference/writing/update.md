# `update`

Sets columns of a table in the rows a condition is true for.

```railroad
update
```

## Signature

```typescript
update(table: string, options: { set: Record<string, Expr | value>; where?: Expr; onConflict?: 'abort' | 'ignore' | 'replace' }): Write
write.run(db: Db): Promise<{ rows: number }>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `table` | `string` | The table. |
| `set` | `Record<string, Expr \\| value>` | Each column to set, to an expression or a value. The expressions read the row as it was. |
| `where` | `Expr` | Which rows. Default: all of them. |
| `onConflict` | `string` | As for [`insertInto`](./insertInto). |

## Returns

A `Write`: `run(db)` runs it and resolves to `{ rows }`, the number of rows changed; `plan(db)` gives its plan.

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | The table, or a column of `set` or `where`, doesn't exist. |
| `SMALTDF_TYPE` | A value doesn't fit its column: a `real` into an `INTEGER` column, for example. |

## Examples

A price rise for one category:

```ts
await frame({ sku: ['a', 'b', 'c'], cat: ['x', 'y', 'x'], price: [10.5, 20, 30] }).createTable(db, 'products');
await update('products', { set: { price: col('price').mul(1.1).round(2) }, where: col('cat').eq('x') }).run(db);
```

| rows |
| --- |
| 2 |

Read back:

```ts
table('products');
```

| sku | cat | price |
| --- | --- | --- |
| a | x | 11.55 |
| b | y | 20 |
| c | x | 33 |

Whole numbers make an `INTEGER` column, which a `real` doesn't fit:

<!-- docs:error SMALTDF_TYPE -->
```ts
await frame({ sku: ['a'], qty: [3] }).createTable(db, 'counts');
await update('counts', { set: { qty: col('qty').div(2) } }).run(db);
```

## Demo

Marking rows done:

```ts
import { col, frame, table, update } from '@smaltworks/smaltdf';

await frame({ task: ['a', 'b'], done: [false, false] }).createTable(db, 'todo');
await update('todo', { set: { done: true }, where: col('task').eq('b') }).run(db);
table('todo');
```

| task | done |
| --- | --- |
| a | false |
| b | true |

## See also

[`deleteFrom`](./deleteFrom), [`insertInto`](./insertInto)
