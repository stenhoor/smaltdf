// The backends smaltdf runs on, for tests: the in-process engine Database (smaltdb/engine) and the client Database
// (smaltdb, here talking to an in-process EngineServer through a fake Worker, so results cross the same columnar wire
// protocol as in a browser), each with case data in a row table or a columnar table.
import * as client from 'smaltdb';
import { Database } from 'smaltdb/engine';
import { EngineServer } from 'smaltdb-src/engine/server.js';
import type { Request } from 'smaltdb-src/shared/protocol.js';
import { smaltdf, type LazyFrame, type SqlValue } from '../src/index.js';
import type { FrameSpec } from './differential/interpret.js';

export type BackendName = 'engine-row' | 'engine-columnar' | 'client-row' | 'client-columnar';
export const BACKENDS: BackendName[] = ['engine-row', 'engine-columnar', 'client-row', 'client-columnar'];

export interface Backend {
  name: BackendName;
  pl: ReturnType<typeof smaltdf>;
  /** Create a table holding `spec` (declared types from its schema) and return a LazyFrame over it. */
  load(spec: FrameSpec): Promise<LazyFrame>;
  close(): Promise<void>;
}

/** A Worker that hands requests to an EngineServer in this process (as smaltdb-io's tests do). */
class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  private readonly server = new EngineServer((_session, msg) => setTimeout(() => this.onmessage?.({ data: structuredClone(msg) })), {
    open: () => Database.openMemory(),
    refreshTimer: false,
  });
  postMessage(req: Request): void {
    const r = structuredClone(req);
    setTimeout(() => this.server.receive(EngineServer.LOCAL, r));
  }
  terminate(): void {}
}
(globalThis as { Worker?: unknown }).Worker ??= FakeWorker;

const DECL = { Int64: 'INTEGER', Float64: 'REAL', String: 'TEXT', Boolean: 'BOOLEAN' } as const;
let seq = 0;

export async function backend(name: BackendName): Promise<Backend> {
  const columnar = name.endsWith('columnar');
  let exec: (sql: string, params?: SqlValue[]) => Promise<void>;
  let pl: ReturnType<typeof smaltdf>;
  let close = async (): Promise<void> => {};
  if (name.startsWith('engine')) {
    const db = Database.openMemory();
    exec = async (sql, params) => db.exec(sql, params);
    pl = smaltdf(db);
  } else {
    const db = await client.open(':memory:', { storage: 'memory', worker: new FakeWorker() as unknown as Worker });
    exec = async (sql, params) => {
      await db.exec(sql, params);
    };
    pl = smaltdf(db);
    close = () => db.close();
  }
  return {
    name,
    pl,
    close,
    async load(spec) {
      const table = `t${++seq}`;
      const names = Object.keys(spec.schema);
      const cols = names.map((n) => `"${n}" ${DECL[spec.schema[n]]}`).join(', ');
      await exec(`CREATE TABLE ${table}(${cols})${columnar ? " WITH (storage = 'columnar')" : ''}`);
      const height = spec.columns[names[0]].length;
      if (height > 0) {
        const params: SqlValue[] = [];
        for (let i = 0; i < height; i++) for (const n of names) {
          const v = spec.columns[n][i];
          params.push(typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'number' && Number.isInteger(v) && !Number.isSafeInteger(v) ? BigInt(v) : (v as SqlValue));
        }
        const row = `(${names.map(() => '?').join(', ')})`;
        await exec(`INSERT INTO ${table} VALUES ${new Array(height).fill(row).join(', ')}`, params);
      }
      return pl.scanTable(table);
    },
  };
}
