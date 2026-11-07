/**
 * Writing (REFERENCE.md "Writing"): a frame's rows into a table or a new table, and changes to a table's rows. Each
 * is a plan statement; a new table and its rows are written in one transaction.
 */
import * as p from 'smaltdb/plan';
import type { CatalogTable, ColumnDef, ConflictAction, PlanStatementInput, StorageType } from 'smaltdb/plan';
import { DfError, fromEngine } from './errors.js';
import { type Expr, type Scope, lit, resolve } from './expr.js';
import { type Db, type Frame, type Tables, tablesOf } from './frame.js';
import { type DfColumn, type DfType, planType } from './types.js';

/** What a write did: the number of rows it wrote, changed or deleted. */
export interface WriteResult {
  readonly rows: number;
}

export interface InsertOptions {
  /** What a row that breaks a constraint does: `abort` (default) undoes the write, `ignore` skips the row, `replace` replaces the row it conflicts with. */
  readonly onConflict?: 'abort' | 'ignore' | 'replace';
}

export interface CreateTableOptions {
  /** Default `row`. */
  readonly storage?: 'row' | 'columnar';
  /** Leave an existing table of that name as it is, and write nothing. Default false: it is an error. */
  readonly ifNotExists?: boolean;
}

/** The storage type a smaltdf type is kept as in a new table. */
const STORAGE: Readonly<Record<DfType, StorageType>> = { int: 'INTEGER', bool: 'BOOLEAN', real: 'REAL', num: 'NUMERIC', text: 'TEXT', blob: 'BLOB', null: 'ANY', any: 'ANY' };

/** Whether a column of type `t` may be written into a table column stored as `s` without changing its values' kind. */
function fits(t: DfType, s: StorageType): boolean {
  if (s === 'ANY' || t === 'null' || t === 'any') return true;
  switch (t) {
    case 'int':
      return s === 'INTEGER' || s === 'REAL' || s === 'NUMERIC';
    case 'bool':
      return s === 'BOOLEAN' || s === 'INTEGER' || s === 'REAL' || s === 'NUMERIC';
    case 'real':
    case 'num':
      return s === 'REAL' || s === 'NUMERIC';
    case 'text':
      return s === 'TEXT';
    case 'blob':
      return s === 'BLOB';
  }
}

function target(tables: Tables, step: string, name: string): CatalogTable {
  const t = tables(name);
  if (!t || t.kind !== 'table') throw new DfError('SMALTDF_SCHEMA', `${step}: no table "${name}"${t ? ` (${name} is a ${t.kind})` : ''}`);
  return t;
}

/** The frame's columns as columns of `t`, by name; each must fit its column's storage. */
function columnsInto(step: string, t: CatalogTable, columns: readonly DfColumn[]): number[] {
  return columns.map((c) => {
    const i = t.columns.findIndex((x) => x.name === c.name);
    if (i < 0) throw new DfError('SMALTDF_SCHEMA', `${step}: ${t.name} has no column "${c.name}" (columns: ${t.columns.map((x) => x.name).join(', ')})`);
    const s = t.columns[i]!.storageType;
    if (!fits(c.type, s)) throw new DfError('SMALTDF_TYPE', `${step}: column ${c.name} is ${c.type}, and ${t.name}.${c.name} holds ${s}`);
    return i;
  });
}

async function runStatements(db: Db, stmts: readonly PlanStatementInput[]): Promise<number> {
  let rows = 0;
  const one = async (run: (s: PlanStatementInput) => unknown) => {
    for (const s of stmts) rows += ((await run(s)) as { changes?: number }).changes ?? 0;
  };
  try {
    if (typeof db.catalog === 'function') {
      // The client: one transaction for all of them, when there are several.
      const client = db as unknown as { transaction<T>(fn: (tx: { queryPlan(s: PlanStatementInput): Promise<unknown> }) => Promise<T>): Promise<T> };
      if (stmts.length === 1) await one((s) => db.queryPlan(s));
      else await client.transaction((tx) => one((s) => tx.queryPlan(s)));
    } else {
      const engine = db as unknown as { queryPlanAsync(s: PlanStatementInput): Promise<unknown>; inTransaction: boolean };
      const own = stmts.length > 1 && !engine.inTransaction;
      if (own) await engine.queryPlanAsync({ kind: 'transaction', action: 'begin', mode: 'deferred' });
      try {
        await one((s) => engine.queryPlanAsync(s));
        if (own) await engine.queryPlanAsync({ kind: 'transaction', action: 'commit' });
      } catch (err) {
        if (own) await engine.queryPlanAsync({ kind: 'transaction', action: 'rollback' });
        throw err;
      }
    }
  } catch (err) {
    throw fromEngine(err);
  }
  return rows;
}

/** @internal `frame`'s rows into `table`, by column name. */
export async function insertInto(frame: Frame, db: Db, table: string, options: InsertOptions = {}): Promise<WriteResult> {
  const tables = await tablesOf(db);
  const { statement, columns } = (await frame.resolved(db, tables)).build(tables);
  const t = target(tables, 'insertInto', table);
  const cols = columnsInto('insertInto', t, columns);
  const plan = (statement as { plan: p.PlanOp }).plan;
  const write: PlanStatementInput = { kind: 'write', plan: p.append(t.name, plan, cols, { db: t.schema, ...(options.onConflict ? { onConflict: options.onConflict as ConflictAction } : {}) }) };
  return { rows: await runStatements(db, [write]) };
}

/** @internal A new table typed from `frame`, holding its rows, in one transaction. */
export async function createTable(frame: Frame, db: Db, name: string, options: CreateTableOptions = {}): Promise<WriteResult> {
  const tables = await tablesOf(db);
  if (options.ifNotExists && tables(name)) return { rows: 0 };
  const { statement, columns } = (await frame.resolved(db, tables)).build(tables);
  const defs: ColumnDef[] = columns.map((c) => ({ name: c.name, declaredType: STORAGE[c.type], type: STORAGE[c.type], notNull: false, collation: 'binary' }));
  const create: PlanStatementInput = { kind: 'schema', op: { op: 'createTable', table: { name, columns: defs, keys: [], checks: [], foreignKeys: [], storage: options.storage ?? 'row' }, temp: false, ifNotExists: false } };
  const fill: PlanStatementInput = { kind: 'write', plan: p.append(name, (statement as { plan: p.PlanOp }).plan, columns.map((_, i) => i)) };
  return { rows: await runStatements(db, [create, fill]) };
}

/** A change to rows of a table, run with `run(db)`. */
export class Write {
  /** @internal */
  constructor(private readonly build: (tables: Tables) => PlanStatementInput) {}

  /** The plan statement it runs as. */
  async plan(db: Db): Promise<PlanStatementInput> {
    return this.build(await tablesOf(db));
  }

  async run(db: Db): Promise<WriteResult> {
    return { rows: await runStatements(db, [this.build(await tablesOf(db))]) };
  }
}

/** The table's rows (all, or those `where` is true for), each with its rowid, and the scope to resolve over them. */
function rowsOf(step: string, t: CatalogTable, where: Expr | undefined): { input: p.PlanOp; scope: Scope; rowid: number } {
  const scope: Scope = { columns: t.columns.map((c) => ({ name: c.name, type: c.type })), source: t.name, step };
  let input: p.PlanOp = p.scan(t.name, [...t.columns.map((_, i) => i), -1], { db: t.schema });
  if (where) {
    const w = resolve(where, scope);
    if (w.type !== 'bool' && w.type !== 'null' && w.type !== 'any') throw new DfError('SMALTDF_TYPE', `${step}: where is bool, not ${w.type}`);
    input = p.filter(input, w.plan);
  }
  return { input, scope, rowid: t.columns.length };
}

/** Changes the rows of `table` that `where` is true for (all when omitted): each column of `set` to its expression, which reads the row as it was. */
export function update(table: string, options: { set: Readonly<Record<string, Expr | number | bigint | string | boolean | Uint8Array | null>>; where?: Expr; onConflict?: 'abort' | 'ignore' | 'replace' }): Write {
  return new Write((tables) => {
    const t = target(tables, 'update', table);
    const { input, scope, rowid } = rowsOf('update', t, options.where);
    const entries = Object.entries(options.set);
    if (entries.length === 0) throw new DfError('SMALTDF_TYPE', 'update: set names no column');
    const sets = entries.map(([name, value]) => {
      const r = resolve(typeof value === 'object' && value !== null && !(value instanceof Uint8Array) ? (value as Expr) : lit(value as number | bigint | string | boolean | Uint8Array | null), scope);
      const [i] = columnsInto('update', t, [{ name, type: r.type }]);
      return { column: i!, value: r.plan };
    });
    return { kind: 'write', plan: p.update(t.name, input, rowid, sets, { db: t.schema, ...(options.onConflict ? { onConflict: options.onConflict } : {}) }) };
  });
}

/** Deletes the rows of `table` that `where` is true for (all when omitted). */
export function deleteFrom(table: string, options: { where?: Expr } = {}): Write {
  return new Write((tables) => {
    const t = target(tables, 'deleteFrom', table);
    const { input, rowid } = rowsOf('deleteFrom', t, options.where);
    return { kind: 'write', plan: p.remove(t.name, input, rowid, { db: t.schema }) };
  });
}
