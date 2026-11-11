/**
 * Views (docs/reference/writing/): a frame stored by name, as smaltdf's own serialized frame (smaltdb ADR 0016 section 6,
 * owner's decision 3), and bound where a plan reads it by `dfLanguage`, which the engine's process registers.
 */
import type { BindContext, ObjectReference, SmaltLanguage } from 'smaltdb/language';
import type { BoundQuery, PlanStatementInput, Source } from 'smaltdb/plan';
import { DfError, fromEngine } from './errors.js';
import { Expr } from './expr.js';
import { type Db, Frame, type Tables, tablesOf } from './frame.js';
import { DF_LANGUAGE, type DfColumn, planType } from './types.js';

/** A view's stored text: the frame, and the columns it gives. */
interface Stored {
  readonly v: 1;
  readonly frame: unknown;
  readonly columns: readonly DfColumn[];
}

/** `x` as JSON data: frames, expressions, bigints and blobs tagged. */
function encode(x: unknown): unknown {
  if (x instanceof Frame) {
    if (x.root.kind === 'values') throw new DfError('SMALTDF_TYPE', 'createView: a view is stored by name, so it reads tables and views, not data from JavaScript (frame(…))');
    const root = x.root.kind === 'concat' ? { kind: 'concat', frames: x.root.frames.map(encode) } : x.root;
    return { $frame: { root, steps: encode(x.steps) } };
  }
  if (x instanceof Expr) return { $expr: encode(x.node) };
  if (typeof x === 'bigint') return { $bigint: x.toString() };
  if (x instanceof Uint8Array) return { $blob: Array.from(x, (b) => b.toString(16).padStart(2, '0')).join('') };
  if (Array.isArray(x)) return x.map(encode);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encode(v)]));
  return x;
}

function decode(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(decode);
  if (!x || typeof x !== 'object') return x;
  const o = x as Record<string, unknown>;
  if ('$frame' in o) {
    const f = o.$frame as { root: { kind: string; name?: string; frames?: unknown[] }; steps: unknown };
    const root = f.root.kind === 'concat' ? { kind: 'concat' as const, frames: (f.root.frames ?? []).map(decode) as Frame[] } : { kind: 'table' as const, name: f.root.name! };
    return new Frame(root, decode(f.steps) as never);
  }
  if ('$expr' in o) return new Expr(decode(o.$expr) as never);
  if ('$bigint' in o) return BigInt(o.$bigint as string);
  if ('$blob' in o) return Uint8Array.from((o.$blob as string).match(/../g) ?? [], (h) => parseInt(h, 16));
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, decode(v)]));
}

function parse(source: Source): { frame: Frame; columns: readonly DfColumn[] } {
  const s = JSON.parse(source.text) as Stored;
  if (s.v !== 1) throw new DfError('SMALTDF_SCHEMA', `view: stored as version ${String(s.v)}, and this smaltdf reads version 1`);
  return { frame: decode(s.frame) as Frame, columns: s.columns };
}

export interface ViewOptions {
  /** Keep the rows, refreshed with `refreshView`; read without running the frame. Default false. */
  readonly materialized?: boolean;
  /** Leave an existing view of that name as it is. Default false: it is an error. */
  readonly ifNotExists?: boolean;
}

/** @internal `frame` stored as view `name`. */
export async function createView(frame: Frame, db: Db, name: string, options: ViewOptions = {}): Promise<void> {
  const tables = await tablesOf(db);
  // Pivot columns are fixed when the view is made: binding the view can't read them.
  const resolved = await frame.resolved(db, tables);
  const { columns } = resolved.build(tables);
  const text = JSON.stringify({ v: 1, frame: encode(resolved), columns } satisfies Stored);
  const stmt: PlanStatementInput = {
    kind: 'schema',
    op: { op: 'createView', name, temp: false, ifNotExists: options.ifNotExists ?? false, materialized: options.materialized ?? false, source: { language: DF_LANGUAGE, text }, ...(options.materialized ? { options: {} } : {}) },
  };
  try {
    await db.queryPlan(stmt as never);
  } catch (err) {
    throw fromEngine(err);
  }
}

/** Recomputes the rows of materialized view `name`. */
export async function refreshView(db: Db, name: string): Promise<void> {
  try {
    await db.queryPlan({ kind: 'maintenance', action: 'refresh', view: name, concurrently: false, withData: true, ifChanged: false } as never);
  } catch (err) {
    throw fromEngine(err);
  }
}

/** The tables and views a frame names: its root, joined frames and concatenated frames. */
function references(f: Frame, out: ObjectReference[] = []): ObjectReference[] {
  if (f.root.kind === 'table') out.push({ name: f.root.name });
  if (f.root.kind === 'concat') for (const g of f.root.frames) references(g, out);
  for (const s of f.steps) if (s.kind === 'join' || s.kind === 'joinAsof') references(s.other, out);
  return out;
}

/** Tables and views as a view's frame reads them where it is bound. */
function tablesIn(ctx: BindContext): Tables {
  return Object.assign((name: string) => ctx.table(name), { view: (name: string) => ctx.getView?.(name) && { ...ctx.getView(name)!, language: ctx.getView(name)!.source.language, text: ctx.getView(name)!.source.text } });
}

/**
 * smaltdf as a language of the engine (smaltdb/language), for its views: register it where the engine runs, with
 * `registerLanguage(dfLanguage)` in process or `defineWorker({ languages: [dfLanguage] })` in a worker entry.
 */
export const dfLanguage: SmaltLanguage = {
  name: DF_LANGUAGE,
  bindView(source: Source, ctx: BindContext): BoundQuery {
    const { frame } = parse(source);
    const { statement, columns } = frame.build(tablesIn(ctx));
    return { kind: 'query', plan: (statement as { plan: BoundQuery['plan'] }).plan, columns: columns.map((c) => ({ name: c.name, type: planType(c.type), collation: 0, affinity: 'NONE' })) as never };
  },
  viewReferences: (source: Source) => references(parse(source).frame),
  viewDefinition: (source: Source) => source.text,
};
