/**
 * Frames (REFERENCE.md "Frames"): a description of rows with named, typed columns. Building one runs nothing;
 * `plan(db)` gives the plan statement it runs as, and `collect(db)` runs it.
 */
import * as p from 'smaltdb/plan';
import type { AggCall, CatalogData, CatalogTable, PlanExpr, PlanOp, PlanStatementInput, SortKey } from 'smaltdb/plan';
import { DfError, fromEngine } from './errors.js';
import { Expr, type Resolved, type Scope, hasAggregate, readsColumns, resolve, resolveAggregate } from './expr.js';
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
  | { readonly kind: 'slice'; readonly offset: number; readonly n: number | undefined }
  | { readonly kind: 'groupBy'; readonly keys: readonly (Expr | string)[]; readonly exprs: readonly (Expr | string)[]; readonly maintainOrder: boolean }
  | { readonly kind: 'unique'; readonly subset: readonly string[] | undefined; readonly keep: 'first' | 'last'; readonly maintainOrder: boolean }
  | { readonly kind: 'join'; readonly other: Frame; readonly options: JoinOptions }
  | { readonly kind: 'joinAsof'; readonly other: Frame; readonly options: AsofOptions };

export type JoinHow = 'inner' | 'left' | 'right' | 'full' | 'semi' | 'anti' | 'cross';

export interface JoinOptions {
  /** Key columns of the same name on both sides: each appears once in the result. */
  readonly on?: string | readonly string[];
  /** Keys of each side, as many on each (names or expressions): both sides' columns stay. */
  readonly leftOn?: string | Expr | readonly (string | Expr)[];
  readonly rightOn?: string | Expr | readonly (string | Expr)[];
  /** Default `inner`. */
  readonly how?: JoinHow;
  /** Added to a right column's name that the left side already has. Default `_right`. */
  readonly suffix?: string;
  /** The left side's order, and for each left row its matches in the right side's order. Default false (it costs). */
  readonly maintainOrder?: boolean;
}

export interface AsofOptions {
  /** The key of both sides (same name), or `leftOn` / `rightOn`. */
  readonly on?: string;
  readonly leftOn?: string | Expr;
  readonly rightOn?: string | Expr;
  /** Columns of the same name on both sides that must also be equal. */
  readonly by?: string | readonly string[];
  /** `backward` (default): the last right row at or before the left key; `forward`: the first at or after; `nearest`. */
  readonly strategy?: 'backward' | 'forward' | 'nearest';
  /** The largest distance between the keys. */
  readonly tolerance?: number;
  readonly suffix?: string;
}

/** A frame's starting rows: a table, or frames one after another. */
type Root = { readonly kind: 'table'; readonly name: string } | { readonly kind: 'concat'; readonly frames: readonly Frame[] };

/** A built frame: its plan and columns. */
interface Built {
  readonly op: PlanOp;
  readonly columns: DfColumn[];
}

export interface GroupByOptions {
  /** Groups in order of each group's first row. Default false: in no particular order (it costs). */
  readonly maintainOrder?: boolean;
}

export interface UniqueOptions {
  /** The columns whose values must differ (default: all). */
  readonly subset?: string | readonly string[];
  /** Which row of each set of equal ones to keep. Default `first`. */
  readonly keep?: 'first' | 'last';
  /** Rows in order of each one's first occurrence. Default false: in no particular order. */
  readonly maintainOrder?: boolean;
}

/** `groupBy(…)`, waiting for its aggregates. */
export class GroupBy {
  /** @internal */
  constructor(
    private readonly frame: Frame,
    private readonly keys: readonly (Expr | string)[],
    private readonly options: GroupByOptions,
  ) {}

  /** One row per distinct key: the keys first, then one column per expression. */
  agg(...exprs: (Expr | string)[]): Frame {
    return this.frame.then({ kind: 'groupBy', keys: this.keys, exprs, maintainOrder: this.options.maintainOrder ?? false });
  }
}

/** Looks up tables: the engine's catalog, in process or as the client's snapshot. */
export type Tables = (name: string) => CatalogTable | undefined;

export class Frame {
  /** @internal */
  constructor(
    private readonly root: Root,
    private readonly steps: readonly Step[],
  ) {}

  /** What error messages call the frame's rows. */
  private get source(): string {
    return this.root.kind === 'table' ? this.root.name : 'concat(…)';
  }

  /** @internal */
  then(step: Step): Frame {
    return new Frame(this.root, [...this.steps, step]);
  }

  /** Rows of this frame matched with `other`'s by keys (REFERENCE.md "Joins"). */
  join(other: Frame, options: JoinOptions = {}): Frame {
    return this.then({ kind: 'join', other, options });
  }

  /** Each row of this frame with the row of `other` whose key is nearest its own (by `strategy`). Keeps this frame's order. */
  joinAsof(other: Frame, options: AsofOptions): Frame {
    return this.then({ kind: 'joinAsof', other, options });
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

  /** Groups by `keys` (names or expressions); a last argument may give options. Then `.agg(…)`. */
  groupBy(...keys: (Expr | string | GroupByOptions)[]): GroupBy {
    const last = keys[keys.length - 1];
    const options = last !== undefined && typeof last === 'object' && !(last instanceof Expr) ? (keys.pop() as GroupByOptions) : {};
    return new GroupBy(this, keys as (Expr | string)[], options);
  }

  /** One row per distinct value of `subset` (all columns by default). */
  unique(options: UniqueOptions = {}): Frame {
    const subset = options.subset === undefined ? undefined : typeof options.subset === 'string' ? [options.subset] : [...options.subset];
    return this.then({ kind: 'unique', subset, keep: options.keep ?? 'first', maintainOrder: options.maintainOrder ?? false });
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
    const { op, columns } = this.buildOp(tables);
    return { statement: { kind: 'query', plan: op, columns: columns.map((c) => ({ name: c.name, type: planType(c.type) })) }, columns };
  }

  /** @internal The frame's plan and columns. */
  buildOp(tables: Tables): Built {
    let { op, columns } = this.buildRoot(tables);
    for (const step of this.steps) {
      const scope: Scope = { columns, source: this.source, step: step.kind };
      switch (step.kind) {
        case 'select': {
          if (step.exprs.some(hasAggregate)) {
            // A select of aggregates: one row, over every row.
            const bare = step.exprs.find((e) => readsColumns(e) && !hasAggregate(e)) ?? step.exprs.find((e) => typeof e === 'string');
            if (bare !== undefined) throw new DfError('SMALTDF_TYPE', `select: mixes aggregates and columns (${typeof bare === 'string' ? bare : resolve(bare, scope).name}): aggregate each, or use groupBy(…).agg(…)`);
            ({ op, columns } = aggregateStep(op, scope, [], step.exprs, false));
            break;
          }
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
        case 'groupBy':
          ({ op, columns } = aggregateStep(op, scope, step.keys, step.exprs, step.maintainOrder));
          break;
        case 'unique': {
          const on = step.subset?.map((name) => {
            const i = columns.findIndex((c) => c.name === name);
            if (i < 0) throw new DfError('SMALTDF_SCHEMA', `unique: no column "${name}" in ${this.source} (columns: ${columns.map((c) => c.name).join(', ')})`);
            return i;
          });
          op = p.distinct(op, columns.length, undefined, { ...(on ? { on } : {}), keep: step.keep, ...(step.maintainOrder ? { ordered: 'first' as const } : {}) });
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
        case 'join':
          ({ op, columns } = joinStep({ op, columns }, this.source, step.other.buildOp(tables), step.other.source, step.options));
          break;
        case 'joinAsof':
          ({ op, columns } = asofStep({ op, columns }, this.source, step.other.buildOp(tables), step.other.source, step.options));
          break;
      }
    }
    return { op, columns };
  }

  private buildRoot(tables: Tables): Built {
    if (this.root.kind === 'concat') return concatOf(this.root.frames.map((f) => f.buildOp(tables)));
    const t = tables(this.root.name);
    if (!t) throw new DfError('SMALTDF_SCHEMA', `table: no table or view "${this.root.name}"`);
    return { op: p.scan(t.name, t.columns.map((_, i) => i), t.schema === 'temp' ? { db: 'temp' } : {}), columns: t.columns.map((c) => ({ name: c.name, type: c.type })) };
  }
}

/** The frames' rows one after another: the first frame's, in its order, then the next's. Columns must match. */
export function concat(frames: readonly Frame[]): Frame {
  if (frames.length === 0) throw new DfError('SMALTDF_RANGE', 'concat: no frames');
  return new Frame({ kind: 'concat', frames: [...frames] }, []);
}

function concatOf(built: readonly Built[]): Built {
  const [first, ...rest] = built as [Built, ...Built[]];
  const columns = first.columns.map((c) => ({ ...c }));
  let op = first.op;
  rest.forEach((b, n) => {
    const names = (cs: readonly DfColumn[]) => cs.map((c) => c.name).join(', ');
    if (names(b.columns) !== names(columns)) throw new DfError('SMALTDF_SCHEMA', `concat: frame ${n + 2} has columns ${names(b.columns)}, not ${names(columns)}`);
    b.columns.forEach((c, i) => {
      const t = columns[i]!.type;
      if (c.type === t || c.type === 'null' || c.type === 'any') return;
      if (t === 'null' || t === 'any') columns[i] = { name: c.name, type: c.type };
      else throw new DfError('SMALTDF_TYPE', `concat: column ${c.name} is ${t} in frame 1 and ${c.type} in frame ${n + 2}: cast one`);
    });
    op = p.setop('unionAll', op, b.op, columns.length);
  });
  return { op, columns };
}

const list = <T>(x: T | readonly T[] | undefined): T[] | undefined => (x === undefined ? undefined : Array.isArray(x) ? [...(x as readonly T[])] : [x as T]);

/** `e` reading input 1 (a join's right side) where it read input 0. */
function onRight(e: PlanExpr): PlanExpr {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (!x || typeof x !== 'object' || ArrayBuffer.isView(x)) return x;
    const o = x as Record<string, unknown>;
    if (o.k === 'col' && o.input === 0) return { ...o, input: 1 };
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)]));
  };
  return walk(e) as PlanExpr;
}

/** Comparable key types, as comparisons need. */
function keyTypes(step: string, l: Resolved, r: Resolved): void {
  const numeric = (t: DfType) => t === 'int' || t === 'real' || t === 'num';
  const loose = (t: DfType) => t === 'null' || t === 'any';
  if (l.type === r.type || loose(l.type) || loose(r.type) || (numeric(l.type) && numeric(r.type))) return;
  throw new DfError('SMALTDF_TYPE', `${step}: key ${l.name} is ${l.type} on the left and ${r.name} is ${r.type} on the right`);
}

/** The left columns, then the right's but `drop`, a right name the left has taking `suffix`. */
function joinColumns(step: string, left: readonly DfColumn[], right: readonly DfColumn[], drop: ReadonlySet<number>, suffix: string, leftExpr: (i: number) => PlanExpr): { exprs: PlanExpr[]; columns: DfColumn[] } {
  const exprs = left.map((_, i) => leftExpr(i));
  const columns = left.map((c) => ({ ...c }));
  right.forEach((c, j) => {
    if (drop.has(j)) return;
    let name = c.name;
    if (columns.some((x) => x.name === name)) name += suffix;
    if (columns.some((x) => x.name === name)) throw new DfError('SMALTDF_SCHEMA', `${step}: two columns named "${name}" (give a different suffix)`);
    exprs.push(p.col(0, left.length + j, planType(c.type)));
    columns.push({ name, type: c.type });
  });
  return { exprs, columns };
}

function joinStep(left: Built, leftSource: string, right: Built, rightSource: string, o: JoinOptions): Built {
  const how = o.how ?? 'inner';
  const on = list(o.on);
  const ls: Scope = { columns: left.columns, source: leftSource, step: 'join' };
  const rs: Scope = { columns: right.columns, source: rightSource, step: 'join' };
  let pred: PlanExpr | undefined;
  if (how === 'cross') {
    if (on || o.leftOn !== undefined || o.rightOn !== undefined) throw new DfError('SMALTDF_TYPE', 'join: a cross join takes no keys');
  } else {
    const lOn = on ?? list(o.leftOn);
    const rOn = on ?? list(o.rightOn);
    if (!lOn || !rOn) throw new DfError('SMALTDF_TYPE', `join: give on, or leftOn and rightOn (or how: 'cross')`);
    if (lOn.length === 0 || lOn.length !== rOn.length) throw new DfError('SMALTDF_TYPE', `join: leftOn and rightOn take the same number of keys, at least one`);
    const lk = lOn.map((e) => resolve(e, ls));
    const rk = rOn.map((e) => resolve(e, rs));
    lk.forEach((l, i) => keyTypes('join', l, rk[i]!));
    const eqs = lk.map((l, i) => ({ ...p.call('cmp_eq', [l.plan, onRight(rk[i]!.plan)], 'int', 'binary'), origin: { step: 'join' } }) as PlanExpr);
    pred = eqs.length === 1 ? eqs[0] : p.and(...eqs);
  }
  const ordered = o.maintainOrder && how !== 'semi' && how !== 'anti' ? { ordered: true } : {};
  const joined = p.join(how, left.op, right.op, pred, ordered);
  if (how === 'semi' || how === 'anti') return { op: joined, columns: left.columns };
  // Keys named by `on` appear once: the left's, the right's for a right join, either for a full join.
  const L = left.columns.length;
  const rightKey = new Map<string, number>((on ?? []).map((n) => [n, right.columns.findIndex((c) => c.name === n)]));
  const leftExpr = (i: number): PlanExpr => {
    const c = left.columns[i]!;
    const j = rightKey.get(c.name);
    const l = p.col(0, i, planType(c.type));
    if (j === undefined || (how !== 'right' && how !== 'full')) return l;
    const r = p.col(0, L + j, planType(right.columns[j]!.type));
    return how === 'right' ? r : p.call('coalesce', [l, r], planType(c.type));
  };
  const { exprs, columns } = joinColumns('join', left.columns, right.columns, new Set(rightKey.values()), o.suffix ?? '_right', leftExpr);
  return { op: p.project(joined, exprs), columns };
}

function asofStep(left: Built, leftSource: string, right: Built, rightSource: string, o: AsofOptions): Built {
  const ls: Scope = { columns: left.columns, source: leftSource, step: 'joinAsof' };
  const rs: Scope = { columns: right.columns, source: rightSource, step: 'joinAsof' };
  const lOn = o.on ?? o.leftOn;
  const rOn = o.on ?? o.rightOn;
  if (lOn === undefined || rOn === undefined) throw new DfError('SMALTDF_TYPE', 'joinAsof: give on, or leftOn and rightOn');
  const lk = resolve(lOn, ls);
  const rk = resolve(rOn, rs);
  keyTypes('joinAsof', lk, rk);
  if (o.tolerance !== undefined && !(Number.isFinite(o.tolerance) && o.tolerance >= 0)) throw new DfError('SMALTDF_RANGE', `joinAsof: tolerance is a distance (0 or more), not ${o.tolerance}`);
  const by = list(o.by) ?? [];
  const eqs = by.map((n) => {
    const l = resolve(n, ls);
    const r = resolve(n, rs);
    keyTypes('joinAsof', l, r);
    return p.call('cmp_eq', [l.plan, onRight(r.plan)], 'int', 'binary');
  });
  const joined = p.asofJoin(left.op, right.op, lk.plan, onRight(rk.plan), {
    direction: o.strategy ?? 'backward',
    ...(o.tolerance !== undefined ? { tolerance: o.tolerance } : {}),
    ...(eqs.length ? { on: eqs.length === 1 ? eqs[0]! : p.and(...eqs) } : {}),
  });
  const drop = new Set([...(o.on !== undefined ? [o.on] : []), ...by].map((n) => right.columns.findIndex((c) => c.name === n)));
  const { exprs, columns } = joinColumns('joinAsof', left.columns, right.columns, drop, o.suffix ?? '_right', (i) => p.col(0, i, planType(left.columns[i]!.type)));
  return { op: p.project(joined, exprs), columns };
}

/**
 * An aggregation: `keys` (none: one row of everything) and expressions over aggregates. The aggregates are resolved
 * against the rows (`input`); the rest of each expression against the keys. `sum` of no values is 0 (owner's
 * decision B): its result is `coalesce(sum, 0)` with the zero of its type.
 */
function aggregateStep(input: PlanOp, scope: Scope, keys: readonly (Expr | string)[], exprs: readonly (Expr | string)[], maintainOrder: boolean): { op: PlanOp; columns: DfColumn[] } {
  const ks = keys.map((k) => resolve(k, scope));
  const calls: AggCall[] = [];
  const post: Scope = {
    columns: ks.map((k) => ({ name: k.name, type: k.type })),
    source: keys.length ? 'the groupBy keys' : 'a select of aggregates',
    step: keys.length ? 'agg' : scope.step,
    agg: (n) => {
      const r = resolveAggregate(n, { ...scope, step: keys.length ? 'agg' : scope.step });
      calls.push(r.call);
      let ref: PlanExpr = p.col(0, ks.length + calls.length - 1, planType(r.type));
      if (n.fn === 'sum') ref = p.call('coalesce', [ref, p.lit(0, r.type === 'real' ? 'real' : 'int')], planType(r.type));
      return { plan: ref, type: r.type, name: r.name };
    },
  };
  const outs = exprs.map((e) => resolve(e, post));
  unique(keys.length ? 'agg' : scope.step, [...ks, ...outs]);
  const agg = p.aggregate(input, ks.map((k) => k.plan), calls, maintainOrder ? { ordered: 'first' } : {});
  const op = p.project(agg, [...ks.map((k, i) => p.col(0, i, planType(k.type))), ...outs.map((o) => o.plan)]);
  return { op, columns: [...ks, ...outs].map((r) => ({ name: r.name, type: r.type })) };
}

/** The rows of a table or view, in storage order. */
export const table = (name: string): Frame => new Frame({ kind: 'table', name }, []);

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
