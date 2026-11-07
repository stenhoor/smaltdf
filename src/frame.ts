/**
 * Frames (REFERENCE.md "Frames"): a description of rows with named, typed columns. Building one runs nothing;
 * `plan(db)` gives the plan statement it runs as, and `collect(db)` runs it.
 */
import * as p from 'smaltdb/plan';
import type { CatalogData, CatalogTable, PlanExpr, PlanOp, PlanStatementInput, SortKey } from 'smaltdb/plan';
import { DfError, fromEngine } from './errors.js';
import { type Expr, type Resolved, type Scope, resolve } from './expr.js';
import { type DfColumn, type DfType, planType } from './types.js';

/** What a frame's statement is built and run with: an engine `Database` (in process) or a client `Database`. */
export interface Db {
  readonly catalog: unknown;
  queryPlan(stmt: PlanStatementInput, params?: readonly never[], options?: unknown): unknown;
}

/** The result of `collect`: column names, their smaltdf types, and the rows as arrays. */
export interface DfResult {
  readonly columns: string[];
  readonly types: DfType[];
  readonly rows: unknown[][];
  /** The rows as objects keyed by column name. */
  toObjects(): Record<string, unknown>[];
}

export interface SortOptions {
  /** One flag, or one per key. Default false. */
  readonly descending?: boolean | readonly boolean[];
  /** Nulls after the other values. Default false: nulls first. */
  readonly nullsLast?: boolean | readonly boolean[];
}

type Step =
  | { readonly kind: 'select'; readonly exprs: readonly (Expr | string)[] }
  | { readonly kind: 'withColumns'; readonly exprs: readonly (Expr | string)[] }
  | { readonly kind: 'filter'; readonly preds: readonly Expr[] }
  | { readonly kind: 'sort'; readonly by: readonly (Expr | string)[]; readonly options: SortOptions }
  | { readonly kind: 'head'; readonly n: number }
  | { readonly kind: 'tail'; readonly n: number }
  | { readonly kind: 'slice'; readonly offset: number; readonly n: number | undefined };

/** Looks up tables: the engine's catalog, in process or as the client's snapshot. */
export type Tables = (name: string) => CatalogTable | undefined;

export class Frame {
  /** @internal */
  constructor(
    private readonly source: string,
    private readonly steps: readonly Step[],
  ) {}

  private then(step: Step): Frame {
    return new Frame(this.source, [...this.steps, step]);
  }

  /** One column per expression, in that order. A string is `col(name)`. */
  select(...exprs: (Expr | string)[]): Frame {
    return this.then({ kind: 'select', exprs });
  }

  /** The frame's columns, with these added at the end or replacing a column of the same name in place. */
  withColumns(...exprs: (Expr | string)[]): Frame {
    return this.then({ kind: 'withColumns', exprs });
  }

  /** The rows where every predicate is true (not false, not null). Keeps order. */
  filter(...preds: Expr[]): Frame {
    return this.then({ kind: 'filter', preds });
  }

  /** Rows ordered by one or more expressions. Stable: equal rows keep their order. */
  sort(by: Expr | string | readonly (Expr | string)[], options: SortOptions = {}): Frame {
    return this.then({ kind: 'sort', by: Array.isArray(by) ? by : [by as Expr | string], options });
  }

  /** The first `n` rows. */
  head(n = 5): Frame {
    return this.then({ kind: 'head', n: count('head', n) });
  }

  /** The last `n` rows. */
  tail(n = 5): Frame {
    return this.then({ kind: 'tail', n: count('tail', n) });
  }

  /** `n` rows (all the rest when omitted) from `offset`. */
  slice(offset: number, n?: number): Frame {
    return this.then({ kind: 'slice', offset: count('slice', offset), n: n === undefined ? undefined : count('slice', n) });
  }

  /** The plan statement the frame runs as, built against `db`'s catalog. */
  async plan(db: Db): Promise<PlanStatementInput> {
    return this.build(await tablesOf(db)).statement;
  }

  /** Runs the frame on `db`. */
  async collect(db: Db): Promise<DfResult> {
    const { statement, columns } = this.build(await tablesOf(db));
    let raw: { columns: string[]; rows: unknown[][] };
    try {
      raw = await run(db, statement);
    } catch (err) {
      throw fromEngine(err);
    }
    const bools = columns.map((c) => c.type === 'bool');
    const rows = raw.rows.map((r) => r.map((v, i) => (bools[i] && v !== null ? v !== 0 && v !== 0n : v)));
    const names = columns.map((c) => c.name);
    return {
      columns: names,
      types: columns.map((c) => c.type),
      rows,
      toObjects: () => rows.map((r) => Object.fromEntries(names.map((n, i) => [n, r[i]]))),
    };
  }

  /** @internal The statement and its columns, built against `tables`. */
  build(tables: Tables): { statement: PlanStatementInput; columns: DfColumn[] } {
    const t = tables(this.source);
    if (!t) throw new DfError('SMALTDF_SCHEMA', `table: no table or view "${this.source}"`);
    let columns: DfColumn[] = t.columns.map((c) => ({ name: c.name, type: c.type }));
    let op: PlanOp = p.scan(t.name, t.columns.map((_, i) => i), t.schema === 'temp' ? { db: 'temp' } : {});
    for (const step of this.steps) {
      const scope: Scope = { columns, source: this.source, step: step.kind };
      switch (step.kind) {
        case 'select': {
          const rs = step.exprs.map((e) => resolve(e, scope));
          unique(step.kind, rs);
          op = p.project(op, rs.map((r) => r.plan));
          columns = rs.map((r) => ({ name: r.name, type: r.type }));
          break;
        }
        case 'withColumns': {
          const rs = step.exprs.map((e) => resolve(e, scope));
          unique(step.kind, rs);
          const exprs: PlanExpr[] = columns.map((c, i) => p.col(0, i, planType(c.type)));
          const next = [...columns];
          for (const r of rs) {
            const i = next.findIndex((c) => c.name === r.name);
            if (i >= 0) {
              exprs[i] = r.plan;
              next[i] = { name: r.name, type: r.type };
            } else {
              exprs.push(r.plan);
              next.push({ name: r.name, type: r.type });
            }
          }
          op = p.project(op, exprs);
          columns = next;
          break;
        }
        case 'filter': {
          if (step.preds.length === 0) break;
          const rs = step.preds.map((e) => resolve(e, scope));
          for (const r of rs) if (r.type !== 'bool' && r.type !== 'null' && r.type !== 'any') throw new DfError('SMALTDF_TYPE', `filter: a predicate is bool, not ${r.type} (${r.name})`);
          op = p.filter(op, rs.length === 1 ? rs[0]!.plan : p.and(...rs.map((r) => r.plan)));
          break;
        }
        case 'sort': {
          const rs = step.by.map((e) => resolve(e, scope));
          const flag = (x: boolean | readonly boolean[] | undefined, i: number): boolean => (Array.isArray(x) ? (x[i] ?? false) : ((x as boolean | undefined) ?? false));
          const keys: SortKey[] = rs.map((r, i) => {
            const nullsFirst = !flag(step.options.nullsLast, i);
            return flag(step.options.descending, i) ? p.desc(r.plan, { nullsFirst }) : p.asc(r.plan, { nullsFirst });
          });
          op = p.sort(op, keys);
          break;
        }
        case 'head':
          op = p.limit(op, step.n);
          break;
        case 'tail':
          op = p.limit(op, step.n, undefined, { fromEnd: true });
          break;
        case 'slice':
          op = p.limit(op, step.n ?? Number.MAX_SAFE_INTEGER, step.offset);
          break;
      }
    }
    return { statement: { kind: 'query', plan: op, columns: columns.map((c) => ({ name: c.name, type: planType(c.type) })) }, columns };
  }
}

/** The rows of a table or view, in storage order. */
export const table = (name: string): Frame => new Frame(name, []);

function count(method: string, n: number): number {
  if (!Number.isSafeInteger(n) || n < 0) throw new DfError('SMALTDF_RANGE', `${method}: expected a whole number of rows (0 or more), not ${n}`);
  return n;
}

function unique(step: string, rs: readonly Resolved[]): void {
  const seen = new Set<string>();
  for (const r of rs) {
    if (seen.has(r.name)) throw new DfError('SMALTDF_SCHEMA', `${step}: two columns named "${r.name}" (give one an alias)`);
    seen.add(r.name);
  }
}

/** The tables of `db`: the client's catalog snapshot, or the engine's catalog in process. */
async function tablesOf(db: Db): Promise<Tables> {
  if (typeof db.catalog === 'function') {
    const data = (await (db.catalog as () => Promise<CatalogData>).call(db)) as CatalogData;
    return (name) => data.tables.find((t) => t.name.toLowerCase() === name.toLowerCase());
  }
  const c = db.catalog as { table(name: string): CatalogTable | undefined };
  return (name) => c.table(name);
}

async function run(db: Db, statement: PlanStatementInput): Promise<{ columns: string[]; rows: unknown[][] }> {
  // The engine in process has queryPlanAsync (a frame may read external data); the client's queryPlan is async.
  const inProcess = (db as { queryPlanAsync?: (s: PlanStatementInput) => Promise<{ columns: string[]; rows: unknown[][] }> }).queryPlanAsync;
  if (typeof db.catalog !== 'function' && inProcess) return inProcess.call(db, statement);
  const r = (await db.queryPlan(statement, [], { rowMode: 'array' })) as unknown[][] & { columns: string[] };
  return { columns: r.columns, rows: [...r] };
}
