# API

The types smaltdf exports, for TypeScript. Every function and method has its own page; this page lists the types they
take and give.

```typescript
import {
  // functions
  col, concat, deleteFrom, frame, len, lit, refreshView, table, update,
  // values
  dfLanguage, DfError, Expr, Frame, GroupBy, Write,
  // types
  type Db, type DfColumn, type DfResult, type DfType, type ExprLike, type WriteResult,
} from '@smaltworks/smaltdf';
```

## Db

```typescript
interface Db {
  readonly catalog: unknown;
  queryPlan(statement: PlanStatementInput, params?: readonly never[], options?: unknown): unknown;
}
```

A smaltdb database: what `collect`, `plan` and the writes take. Both of smaltdb's databases are one:

- in process, `Database` from `smaltdb/engine` (`Database.openMemory()`, or `Database.open(vfs, name)`);
- through a worker, the client's `Database` from `open()` in `smaltdb`.

smaltdf reads the tables' columns from `catalog` and runs plans with `queryPlan`. It never sends text to the engine.

## Frame

A description of rows. Built by [`table`](./frames/table), [`frame`](./frames/frame) and [`concat`](./frames/concat);
its methods are on the [Frames](./frames/) pages and [Writing and views](./writing/). A `Frame` is immutable: each
method gives a new one.

## GroupBy

What [`groupBy`](./frames/groupBy) gives: its one method, `agg(...columns)`, gives a `Frame`.

## Expr

A description of a value per row. Built by [`col`](./expressions/col), [`lit`](./expressions/lit) and
[`len`](./aggregates/len); its methods are on the [Expressions](./expressions/), [Aggregates](./aggregates/),
[Windows](./windows/) pages, and in the namespaces `str`, `dt`, `list` and `struct`.

```typescript
type ExprLike = Expr | number | bigint | string | boolean | Uint8Array | Date | null;
```

An `ExprLike` is an operand: an expression, or a JavaScript value that becomes a constant (a string is text, not a
column).

## DfResult

```typescript
interface DfResult {
  readonly columns: string[];
  readonly types: DfType[];
  readonly rows: unknown[][];
  toObjects(): Record<string, unknown>[];
}
```

What [`collect`](./frames/collect) gives: the column names, their types, and the rows as arrays. `toObjects()` gives the
rows as objects by column name.

## DfType, DfColumn

```typescript
type DfType =
  | 'int' | 'real' | 'num' | 'bool' | 'text' | 'blob' | 'any' | 'null'
  | 'date' | 'datetime' | 'time' | 'duration'
  | `list<${string}>` | `struct<${string}>`;

interface DfColumn {
  readonly name: string;
  readonly type: DfType;
}
```

A column's type, as smaltdf knows it when it builds a plan. The [types](./#types) are described in the overview. `num`
is a column the engine stores as `NUMERIC`: an `int` or a `real` per value.

## Write, WriteResult

```typescript
class Write {
  run(db: Db): Promise<WriteResult>;
  plan(db: Db): Promise<PlanStatementInput>;
}

interface WriteResult {
  readonly rows: number;
}
```

What [`update`](./writing/update) and [`deleteFrom`](./writing/deleteFrom) give. `insertInto` and `createTable` resolve
to a `WriteResult` directly.

## DfError

```typescript
class DfError extends Error {
  readonly name: 'DfError';
  readonly code: string;
}
```

Every error smaltdf raises is a `DfError`, and so is an engine error from a plan node a smaltdf method built: its
message names the method, and the engine's error is kept as its `cause`. `code` is one of smaltdf's (`SMALTDF_SCHEMA`,
`SMALTDF_TYPE`, `SMALTDF_RANGE`) or the engine's (`SMALT_RANGE`, `SMALT_MISMATCH`, …). An engine error that no method's
node raised, such as an integer `sum` that overflows, comes as the engine's own error, with the same `code` property.
[Errors](../guide/errors) lists them.

## dfLanguage

smaltdf as a language of the engine, for reading smaltdf's views: see [`dfLanguage`](./writing/dfLanguage).
