/**
 * Databases for the tests: the engine in process, and the client through the worker server. Tables are made and
 * filled with plan statements: no language is registered, so nothing here can reach SQL.
 */
import * as client from 'smaltdb';
import { Database } from 'smaltdb/engine';
import * as p from 'smaltdb/plan';
import type { ColumnDef, PlanStatementInput, SqlValue, StorageType } from 'smaltdb/plan';
import { EngineServer } from 'smaltdb-src/engine/server.js';
import type { Request, Response } from 'smaltdb-src/shared/protocol.js';
import type { Db } from '../../src/frame.js';

class FakeWorker {
  onmessage: ((e: { data: Response }) => void) | null = null;
  onerror: unknown = null;
  readonly server = new EngineServer((_s, msg) => setTimeout(() => this.onmessage?.({ data: structuredClone(msg) })), { open: () => Database.openMemory(), refreshTimer: false });
  postMessage(req: Request): void {
    const r = structuredClone(req);
    setTimeout(() => this.server.receive(EngineServer.LOCAL, r));
  }
  terminate(): void {}
}
(globalThis as { Worker?: unknown }).Worker ??= FakeWorker;

export type Kind = 'in process (row)' | 'in process (columnar)' | 'worker (row)';
export const KINDS: readonly Kind[] = ['in process (row)', 'in process (columnar)', 'worker (row)'];

export interface TableSpec {
  readonly name: string;
  readonly columns: readonly [string, StorageType][];
  readonly rows: readonly (readonly SqlValue[])[];
}

const columnDef = ([name, type]: [string, StorageType]): ColumnDef => ({ name, declaredType: type, type, notNull: false, collation: 'binary' });

/** A database of `kind` holding `tables`; `close` releases it. */
export async function makeDb(kind: Kind, tables: readonly TableSpec[]): Promise<{ db: Db; close(): Promise<void> }> {
  const storage = kind === 'in process (columnar)' ? 'columnar' : 'row';
  const stmts: PlanStatementInput[] = [];
  for (const t of tables) {
    stmts.push({ kind: 'schema', op: { op: 'createTable', table: { name: t.name, columns: t.columns.map(columnDef), keys: [], checks: [], foreignKeys: [], storage }, temp: false, ifNotExists: false } });
    if (t.rows.length) stmts.push({ kind: 'write', plan: p.append(t.name, p.values(t.rows.map((r) => r.map((v) => p.lit(v)))), t.columns.map((_, i) => i)) });
  }
  if (kind === 'worker (row)') {
    const db = await client.open(':memory:', { storage: 'memory', worker: new FakeWorker() as unknown as Worker });
    for (const s of stmts) await db.queryPlan(s);
    return { db: db as unknown as Db, close: () => db.close() };
  }
  const db = Database.openMemory();
  for (const s of stmts) db.queryPlan(s);
  return { db: db as unknown as Db, close: async () => db.close() };
}
