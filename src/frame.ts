/**
 * Frames (REFERENCE.md "Frames"): a description of rows with named, typed columns. Building one runs nothing;
 * `plan(db)` gives the plan statement it runs as, and `collect(db)` runs it.
 */
import * as p from 'smaltdb/plan';
import type { AggCall, CatalogData, CatalogTable, PlanExpr, PlanOp, PlanStatementInput, SortKey, ValueColumn } from 'smaltdb/plan';
import { DfError, fromEngine } from './errors.js';
import { type CreateTableOptions, type InsertOptions, type WriteResult, createTable, insertInto } from './write.js';
import { type AggNode, Expr, type Resolved, type ResolvedWindow, type Scope, col, hasAggregate, len, readsColumns, resolve, resolveAggregate, resolveWindow } from './expr.js';
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
  | { readonly kind: 'joinAsof'; readonly other: Frame; readonly options: AsofOptions }
  | { readonly kind: 'unpivot'; readonly options: UnpivotOptions }
  | { readonly kind: 'pivot'; readonly on: string; readonly options: PivotOptions }
  | { readonly kind: 'sample'; readonly options: SampleOptions };

export interface UnpivotOptions {
  /** Columns kept on every row. Default: none (with `on`), or the columns `on` doesn't name. */
  readonly index?: string | readonly string[];
  /** Columns that become rows. Default: every column `index` doesn't name. */
  readonly on?: string | readonly string[];
  /** Default `variable`. */
  readonly variableName?: string;
  /** Default `value`. */
  readonly valueName?: string;
}

export interface PivotOptions {
  /** The columns that identify a row of the result. */
  readonly index: string | readonly string[];
  /** The column whose values fill the cells. */
  readonly values: string;
  /** How a cell's values combine. Default `first`. */
  readonly aggregate?: 'first' | 'last' | 'sum' | 'mean' | 'min' | 'max' | 'count' | 'len' | 'median';
  /** The values of `on` that become columns, in order. Default: every value `on` has, sorted, read first. */
  readonly columns?: readonly (number | bigint | string | null)[];
  /** Rows in order of each index value's first row. Default false. */
  readonly maintainOrder?: boolean;
}

export interface SampleOptions {
  /** A number of rows, or */
  readonly n?: number;
  /** a fraction of them. */
  readonly fraction?: number;
  /** Draw each row from all rows (rows in the order drawn). Default false: distinct rows, in their order. */
  readonly withReplacement?: boolean;
  /** The same seed draws the same rows. Default: a new one each time. */
  readonly seed?: number;
}

/** Columns given as JavaScript data (`frame`): typed arrays or arrays of values. */
export type FrameData = Readonly<Record<string, ArrayLike<unknown> & Iterable<unknown>>>;

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
type Root =
  | { readonly kind: 'table'; readonly name: string }
  | { readonly kind: 'concat'; readonly frames: readonly Frame[] }
  | { readonly kind: 'values'; readonly columns: readonly { readonly name: string; readonly data: ValueColumn; readonly type: DfType }[]; readonly length: number };

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
    return this.frame.withStep({ kind: 'groupBy', keys: this.keys, exprs, maintainOrder: this.options.maintainOrder ?? false });
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
    return this.root.kind === 'table' ? this.root.name : this.root.kind === 'concat' ? 'concat(…)' : 'frame(…)';
  }

  /** Rows turned into columns: one per value of `on`, the cells from `values` (REFERENCE.md "Reshaping"). */
  pivot(on: string, options: PivotOptions): Frame {
    return this.withStep({ kind: 'pivot', on, options });
  }

  /** Columns turned into rows: one per column of `on` for each row, with its name and value. */
  unpivot(options: UnpivotOptions = {}): Frame {
    return this.withStep({ kind: 'unpivot', options });
  }

  /** Writes the frame's rows into `table`, by column name: other columns take their defaults. */
  insertInto(db: Db, table: string, options: InsertOptions = {}): Promise<WriteResult> {
    return insertInto(this, db, table, options);
  }

  /** A new table with the frame's columns and types, holding its rows; both in one transaction. */
  createTable(db: Db, name: string, options: CreateTableOptions = {}): Promise<WriteResult> {
    return createTable(this, db, name, options);
  }

  /** Rows drawn at random: `n` of them, or a `fraction`. */
  sample(options: SampleOptions): Frame {
    const { n, fraction } = options;
    if ((n === undefined) === (fraction === undefined)) throw new DfError('SMALTDF_RANGE', 'sample: give n or fraction');
    if (n !== undefined) count('sample', n);
    if (fraction !== undefined && !(fraction >= 0 && (options.withReplacement || fraction <= 1))) throw new DfError('SMALTDF_RANGE', `sample: a fraction is between 0 and 1 without replacement, not ${fraction}`);
    if (options.seed !== undefined && !Number.isSafeInteger(options.seed)) throw new DfError('SMALTDF_RANGE', `sample: a seed is a whole number, not ${options.seed}`);
    return this.withStep({ kind: 'sample', options: { ...options, seed: options.seed ?? Math.floor(Math.random() * 2 ** 31) } });
  }

  /** @internal The frame with every pivot's columns known: those not given are read from `db` first. */
  async resolved(db: Db, tables: Tables): Promise<Frame> {
    const root: Root = this.root.kind === 'concat' ? { kind: 'concat', frames: await Promise.all(this.root.frames.map((f) => f.resolved(db, tables))) } : this.root;
    const steps: Step[] = [];
    for (const step of this.steps) {
      if (step.kind === 'join' || step.kind === 'joinAsof') steps.push({ ...step, other: await step.other.resolved(db, tables) } as Step);
      else if (step.kind === 'pivot' && step.options.columns === undefined) {
        const values = new Frame(root, steps).select(step.on).unique().sort(step.on);
        let r: { columns: string[]; rows: unknown[][] };
        try {
          r = await run(db, values.build(tables).statement);
        } catch (err) {
          throw fromEngine(err);
        }
        steps.push({ ...step, options: { ...step.options, columns: r.rows.map((x) => x[0] as number | bigint | string | null) } });
      } else steps.push(step);
    }
    return new Frame(root, steps);
  }

  /** @internal (Not `then`: a frame must not look like a promise to `await`.) */
  withStep(step: Step): Frame {
    return new Frame(this.root, [...this.steps, step]);
  }

  /** Rows of this frame matched with `other`'s by keys (REFERENCE.md "Joins"). */
  join(other: Frame, options: JoinOptions = {}): Frame {
    return this.withStep({ kind: 'join', other, options });
  }

  /** Each row of this frame with the row of `other` whose key is nearest its own (by `strategy`). Keeps this frame's order. */
  joinAsof(other: Frame, options: AsofOptions): Frame {
    return this.withStep({ kind: 'joinAsof', other, options });
  }

  /** One column per expression, in that order. A string is `col(name)`. */
  select(...exprs: (Expr | string)[]): Frame {
    return this.withStep({ kind: 'select', exprs });
  }

  /** The frame's columns, with these added at the end or replacing a column of the same name in place. */
  withColumns(...exprs: (Expr | string)[]): Frame {
    return this.withStep({ kind: 'withColumns', exprs });
  }

  /** The rows where every predicate is true (not false, not null). Keeps order. */
  filter(...preds: Expr[]): Frame {
    return this.withStep({ kind: 'filter', preds });
  }

  /** Rows ordered by one or more expressions. Stable: equal rows keep their order. */
  sort(by: Expr | string | readonly (Expr | string)[], options: SortOptions = {}): Frame {
    return this.withStep({ kind: 'sort', by: Array.isArray(by) ? by : [by as Expr | string], options });
  }

  /** The first `n` rows. */
  head(n = 5): Frame {
    return this.withStep({ kind: 'head', n: count('head', n) });
  }

  /** The last `n` rows. */
  tail(n = 5): Frame {
    return this.withStep({ kind: 'tail', n: count('tail', n) });
  }

  /** `n` rows (all the rest when omitted) from `offset`. */
  slice(offset: number, n?: number): Frame {
    return this.withStep({ kind: 'slice', offset: count('slice', offset), n: n === undefined ? undefined : count('slice', n) });
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
    return this.withStep({ kind: 'unique', subset, keep: options.keep ?? 'first', maintainOrder: options.maintainOrder ?? false });
  }

  /** The plan statement the frame runs as, built against `db`'s catalog. */
  async plan(db: Db): Promise<PlanStatementInput> {
    const tables = await tablesOf(db);
    return (await this.resolved(db, tables)).build(tables).statement;
  }

  /** Runs the frame on `db`. */
  async collect(db: Db): Promise<DfResult> {
    const tables = await tablesOf(db);
    const { statement, columns } = (await this.resolved(db, tables)).build(tables);
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
          const w = withWindows(op, scope, (sc) => step.exprs.map((e) => resolve(e, sc)));
          unique(step.kind, w.results);
          op = p.project(w.op, w.results.map((r) => r.plan));
          columns = w.results.map((r) => ({ name: r.name, type: r.type }));
          break;
        }
        case 'withColumns': {
          const w = withWindows(op, scope, (sc) => step.exprs.map((e) => resolve(e, sc)));
          const rs = w.results;
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
          op = p.project(w.op, exprs);
          columns = next;
          break;
        }
        case 'filter': {
          if (step.preds.length === 0) break;
          const w = withWindows(op, scope, (sc) => step.preds.map((e) => resolve(e, sc)));
          const rs = w.results;
          for (const r of rs) if (r.type !== 'bool' && r.type !== 'null' && r.type !== 'any') throw new DfError('SMALTDF_TYPE', `filter: a predicate is bool, not ${r.type} (${r.name})`);
          op = p.filter(w.op, rs.length === 1 ? rs[0]!.plan : p.and(...rs.map((r) => r.plan)));
          // The windows' columns were only for the predicates.
          if (w.added) op = p.project(op, columns.map((c, i) => p.col(0, i, planType(c.type))));
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
        case 'unpivot':
          ({ op, columns } = unpivotStep({ op, columns }, this.source, step.options));
          break;
        case 'pivot':
          ({ op, columns } = pivotStep({ op, columns }, scope, step.on, step.options));
          break;
        case 'sample': {
          const o = step.options;
          op = p.sample(op, o.n !== undefined ? { count: o.n } : { fraction: o.fraction! }, { replace: o.withReplacement ?? false, seed: o.seed! });
          break;
        }
      }
    }
    return { op, columns };
  }

  private buildRoot(tables: Tables): Built {
    if (this.root.kind === 'concat') return concatOf(this.root.frames.map((f) => f.buildOp(tables)));
    if (this.root.kind === 'values') {
      const cs = this.root.columns;
      return { op: p.fromColumns(cs.map((c) => c.data), cs.map((c) => planType(c.type))), columns: cs.map((c) => ({ name: c.name, type: c.type })) };
    }
    const t = tables(this.root.name);
    if (!t) throw new DfError('SMALTDF_SCHEMA', `table: no table or view "${this.root.name}"`);
    return { op: p.scan(t.name, t.columns.map((_, i) => i), t.schema === 'temp' ? { db: 'temp' } : {}), columns: t.columns.map((c) => ({ name: c.name, type: c.type })) };
  }
}

/**
 * Expressions resolved with the windows they use computed beneath `input`. Calls of one window (the same partition,
 * order and frame) share one; each window adds its calls' columns after the input's. A window with an order would let
 * the engine reorder the rows, so the rows are numbered first (a window without order numbers them in input order)
 * and sorted back after: rows keep their place, as the reference says.
 */
function withWindows(input: PlanOp, scope: Scope, resolveAll: (sc: Scope) => Resolved[]): { op: PlanOp; results: Resolved[]; added: boolean } {
  const found: ResolvedWindow[] = [];
  const first = resolveAll({ ...scope, win: (n) => { const w = resolveWindow(n, scope); found.push(w); return { plan: p.lit(null), type: w.type, name: w.name }; } });
  if (found.length === 0) return { op: input, results: first, added: false };
  const width = scope.columns.length;
  const groups = new Map<string, number[]>();
  found.forEach((w, i) => {
    const key = JSON.stringify([w.partition, w.order, w.frame]);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  const ordered = found.some((w) => w.order.length > 0);
  let op = input;
  let at = width;
  if (ordered) {
    op = p.window(op, [p.windowCall('row_number', [], 'int')]);
    at += 1;
  }
  const index: number[] = [];
  for (const members of groups.values()) {
    const w0 = found[members[0]!]!;
    op = p.window(op, members.map((i) => found[i]!.call), { partition: w0.partition, order: w0.order, frame: w0.frame });
    members.forEach((i, j) => (index[i] = at + j));
    at += members.length;
  }
  if (ordered) op = p.sort(op, [p.asc(p.col(0, width, 'int'))]);
  let next = 0;
  const results = resolveAll({ ...scope, win: () => { const i = next++; const w = found[i]!; return { plan: w.read(p.col(0, index[i]!, planType(w.type))), type: w.type, name: w.name }; } });
  return { op, results, added: true };
}

/** Rows from JavaScript data: one column per key, typed arrays or arrays of values, all of one length. */
export function frame(data: FrameData): Frame {
  const entries = Object.entries(data);
  if (entries.length === 0) throw new DfError('SMALTDF_SCHEMA', 'frame: no columns');
  const columns = entries.map(([name, values]) => ({ name, ...columnOf(name, values) }));
  const length = columns[0]!.length;
  for (const c of columns) if (c.length !== length) throw new DfError('SMALTDF_SCHEMA', `frame: column ${c.name} has ${c.length} values, not ${length}`);
  return new Frame({ kind: 'values', columns: columns.map(({ name, data, type }) => ({ name, data, type })), length }, []);
}

const INT_ARRAYS = [Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, BigInt64Array];

/** A column's data as the engine reads it, and its smaltdf type. */
function columnOf(name: string, values: ArrayLike<unknown> & Iterable<unknown>): { data: ValueColumn; type: DfType; length: number } {
  if (values instanceof Float64Array || values instanceof Float32Array) return { data: values, type: 'real', length: values.length };
  if (INT_ARRAYS.some((k) => values instanceof k)) return { data: values as ValueColumn, type: 'int', length: values.length };
  const arr = Array.from(values);
  const kinds = new Set<string>(arr.filter((v) => v !== null && v !== undefined).map((v) => (v instanceof Uint8Array ? 'blob' : typeof v)));
  const kind = (k: string): boolean => kinds.has(k);
  if ([...kinds].some((k) => !['number', 'bigint', 'string', 'boolean', 'blob'].includes(k))) throw new DfError('SMALTDF_TYPE', `frame: column ${name} holds values of a kind smaltdf has no type for (${[...kinds].join(', ')})`);
  if (kinds.size > 1 && !(kinds.size === 2 && kind('number') && kind('bigint'))) throw new DfError('SMALTDF_TYPE', `frame: column ${name} mixes ${[...kinds].join(' and ')}`);
  // An integer in the safe range is a number, as the engine gives integers back; a bigint only beyond it.
  const clean = arr.map((v) => (v === undefined ? null : typeof v === 'bigint' && v >= -9007199254740991n && v <= 9007199254740991n ? Number(v) : v));
  if (kind('boolean')) return { data: clean.map((v) => (v === null ? null : v ? 1 : 0)), type: 'bool', length: arr.length };
  if (kind('string')) return { data: clean as string[], type: 'text', length: arr.length };
  if (kind('blob')) return { data: clean as Uint8Array[], type: 'blob', length: arr.length };
  if (kind('number') || kind('bigint')) {
    const ints = clean.every((v) => v === null || typeof v === 'bigint' || Number.isInteger(v));
    return { data: clean as (number | bigint | null)[], type: ints ? 'int' : 'real', length: arr.length };
  }
  return { data: clean as null[], type: 'null', length: arr.length };
}

const pick = (step: string, source: string, columns: readonly DfColumn[], names: readonly string[]): number[] =>
  names.map((n) => {
    const i = columns.findIndex((c) => c.name === n);
    if (i < 0) throw new DfError('SMALTDF_SCHEMA', `${step}: no column "${n}" in ${source} (columns: ${columns.map((c) => c.name).join(', ')})`);
    return i;
  });

function unpivotStep(input: Built, source: string, o: UnpivotOptions): Built {
  const names = input.columns.map((c) => c.name);
  const index = list(o.index) ?? (o.on !== undefined ? [] : undefined);
  const on = list(o.on) ?? names.filter((n) => !(index ?? []).includes(n));
  const keep = pick('unpivot', source, input.columns, index ?? names.filter((n) => !on.includes(n)));
  const cols = pick('unpivot', source, input.columns, on);
  const types = [...new Set(cols.map((i) => input.columns[i]!.type))];
  const type: DfType = types.length === 1 ? types[0]! : 'any';
  const variable = o.variableName ?? 'variable';
  const value = o.valueName ?? 'value';
  const out = [...keep.map((i) => input.columns[i]!), { name: variable, type: 'text' as DfType }, { name: value, type }];
  if (new Set(out.map((c) => c.name)).size !== out.length) throw new DfError('SMALTDF_SCHEMA', `unpivot: two columns named the same (choose variableName / valueName)`);
  return { op: p.unpivot(input.op, keep, cols, on, planType(type)), columns: out };
}

function pivotStep(input: Built, scope: Scope, on: string, o: PivotOptions): Built {
  const sc: Scope = { ...scope, step: 'pivot' };
  const keys = (list(o.index) ?? []).map((k) => resolve(k, sc));
  if (keys.length === 0) throw new DfError('SMALTDF_TYPE', 'pivot: give index, the columns that identify a row');
  const onR = resolve(on, sc);
  const fn = o.aggregate ?? 'first';
  const valueExpr = fn === 'len' ? len() : col(o.values)[fn]();
  const agg = resolveAggregate(valueExpr.node as AggNode, sc);
  const values = o.columns ?? [];
  const op0 = p.pivot(input.op, keys.map((k) => k.plan), onR.plan, values as Parameters<typeof p.pivot>[3], [agg.call], o.maintainOrder ? { ordered: 'first' } : {});
  // sum of no values is 0 (decision B): a cell with no rows is 0 for sum.
  const cells = values.map((v, i) => {
    const ref = p.col(0, keys.length + i, planType(agg.type));
    return fn === 'sum' ? p.call('coalesce', [ref, p.lit(0, agg.type === 'real' ? 'real' : 'int')], planType(agg.type)) : ref;
  });
  const columns = [...keys.map((k) => ({ name: k.name, type: k.type })), ...values.map((v) => ({ name: v === null ? 'null' : String(v), type: agg.type }))];
  if (new Set(columns.map((c) => c.name)).size !== columns.length) throw new DfError('SMALTDF_SCHEMA', `pivot: a value of ${on} names a column the index has (${columns.map((c) => c.name).join(', ')})`);
  return { op: p.project(op0, [...keys.map((k, i) => p.col(0, i, planType(k.type))), ...cells]), columns };
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
/** @internal */
export async function tablesOf(db: Db): Promise<Tables> {
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
