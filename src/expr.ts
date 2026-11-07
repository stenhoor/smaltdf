/**
 * Expressions (REFERENCE.md "Expressions"): a description of a value per row, resolved against a frame's columns when
 * its plan is built. Each method maps to the engine operation that means what smaltdf's reference says.
 */
import * as p from 'smaltdb/plan';
import type { AggCall, PlanExpr, SortKey, WindowCall, WindowFrame } from 'smaltdb/plan';
import { DfError, type DfOrigin } from './errors.js';
import { type DfColumn, type DfType, isNumeric, planType } from './types.js';

/** A value an expression method takes: an expression, or a literal (`lit` is applied). */
export type ExprLike = Expr | number | bigint | string | boolean | Uint8Array | null;

type Node =
  | { readonly k: 'col'; readonly name: string }
  | { readonly k: 'lit'; readonly value: number | bigint | string | boolean | Uint8Array | null }
  | { readonly k: 'op'; readonly method: string; readonly args: readonly Node[] }
  | { readonly k: 'cast'; readonly to: CastType; readonly arg: Node }
  | { readonly k: 'alias'; readonly name: string; readonly arg: Node }
  | AggNode
  | WinNode
  | OverNode;

/** Window functions (REFERENCE.md "Windows"): over the frame's rows in order, or a partition's. */
export type WinFn = 'cumSum' | 'cumMin' | 'cumMax' | 'cumCount' | 'shift' | 'rank';

export type RankMethod = 'min' | 'dense' | 'ordinal';

/** @internal */
export interface WinNode {
  readonly k: 'win';
  readonly fn: WinFn;
  readonly arg: Node;
  readonly n?: number;
  readonly fill?: Node;
  readonly method?: RankMethod;
  readonly descending?: boolean;
}

/** @internal An aggregate or window function over partitions, ordered within each by `order`. */
export interface OverNode {
  readonly k: 'over';
  readonly arg: Node;
  readonly partition: readonly Node[];
  readonly order: readonly Node[];
  readonly descending: readonly boolean[];
}

/** The aggregates (REFERENCE.md "Aggregation"). */
export type AggFn = 'sum' | 'mean' | 'min' | 'max' | 'count' | 'len' | 'first' | 'last' | 'median' | 'std' | 'var';

/** @internal An aggregate of `arg` (none for `len`). */
export interface AggNode {
  readonly k: 'agg';
  readonly fn: AggFn;
  readonly arg: Node | null;
}

export type CastType = 'int' | 'real' | 'text' | 'blob';

/** A resolved expression: its plan expression, smaltdf type and output name. */
export interface Resolved {
  readonly plan: PlanExpr;
  readonly type: DfType;
  readonly name: string;
}

/** What an expression is resolved against: the frame's columns (input 0) and the frame method using it. */
export interface Scope {
  readonly columns: readonly DfColumn[];
  readonly source: string;
  readonly step: string;
  /** Resolves an aggregate, where the step aggregates (groupBy(…).agg, a select of aggregates); elsewhere none. */
  readonly agg?: (n: AggNode) => Resolved;
  /** Resolves a window function or an `over`, where the step computes windows (select, withColumns, filter). */
  readonly win?: (n: WinNode | OverNode) => Resolved;
}

const node = (x: ExprLike): Node => (x instanceof Expr ? x.node : { k: 'lit', value: x });

export class Expr {
  /** @internal */
  constructor(readonly node: Node) {}

  private op(method: string, ...args: ExprLike[]): Expr {
    return new Expr({ k: 'op', method, args: [this.node, ...args.map(node)] });
  }

  add(other: ExprLike): Expr { return this.op('add', other); }
  sub(other: ExprLike): Expr { return this.op('sub', other); }
  mul(other: ExprLike): Expr { return this.op('mul', other); }
  /** True division: always real (`7 / 2` is 3.5). */
  div(other: ExprLike): Expr { return this.op('div', other); }
  /** Division rounded toward negative infinity (`-7 // 2` is -4). */
  floorDiv(other: ExprLike): Expr { return this.op('floorDiv', other); }
  /** The remainder with the sign of the divisor (`-7 % 2` is 1). */
  mod(other: ExprLike): Expr { return this.op('mod', other); }

  eq(other: ExprLike): Expr { return this.op('eq', other); }
  ne(other: ExprLike): Expr { return this.op('ne', other); }
  lt(other: ExprLike): Expr { return this.op('lt', other); }
  le(other: ExprLike): Expr { return this.op('le', other); }
  gt(other: ExprLike): Expr { return this.op('gt', other); }
  ge(other: ExprLike): Expr { return this.op('ge', other); }
  /** Equality where null equals null; never null. */
  eqMissing(other: ExprLike): Expr { return this.op('eqMissing', other); }

  and(other: ExprLike): Expr { return this.op('and', other); }
  or(other: ExprLike): Expr { return this.op('or', other); }
  not(): Expr { return this.op('not'); }

  isNull(): Expr { return this.op('isNull'); }
  isNotNull(): Expr { return this.op('isNotNull'); }

  /** Conversion; a value that does not convert is an error. */
  cast(to: CastType): Expr { return new Expr({ k: 'cast', to, arg: this.node }); }
  /** The same expression under another name. */
  alias(name: string): Expr { return new Expr({ k: 'alias', name, arg: this.node }); }
  /** Rounding half to even, to `digits` places. */
  round(digits = 0): Expr { return this.op('round', digits); }

  /** The sum of the non-null values; 0 when there are none. */
  sum(): Expr { return this.aggregate('sum'); }
  /** The mean of the non-null values; null when there are none. */
  mean(): Expr { return this.aggregate('mean'); }
  min(): Expr { return this.aggregate('min'); }
  max(): Expr { return this.aggregate('max'); }
  /** The number of non-null values. */
  count(): Expr { return this.aggregate('count'); }
  /** The first value, in the group's order. */
  first(): Expr { return this.aggregate('first'); }
  /** The last value, in the group's order. */
  last(): Expr { return this.aggregate('last'); }
  median(): Expr { return this.aggregate('median'); }
  /** The sample standard deviation. */
  std(): Expr { return this.aggregate('std'); }
  /** The sample variance. */
  var(): Expr { return this.aggregate('var'); }

  /** The running sum, in the frame's order (or `over`'s): null where the value is null. */
  cumSum(): Expr { return this.window({ fn: 'cumSum' }); }
  cumMin(): Expr { return this.window({ fn: 'cumMin' }); }
  cumMax(): Expr { return this.window({ fn: 'cumMax' }); }
  /** The number of non-null values so far. */
  cumCount(): Expr { return this.window({ fn: 'cumCount' }); }
  /** The value `n` rows earlier (later for a negative `n`), or `fill` (default null) where there is none. */
  shift(n = 1, fill: ExprLike = null): Expr {
    if (!Number.isSafeInteger(n)) throw new DfError('SMALTDF_RANGE', `shift: expected a whole number of rows, not ${n}`);
    return this.window({ fn: 'shift', n, fill: node(fill) });
  }
  /** The value's rank: `min` (default; ties share the lowest), `dense`, or `ordinal` (ties by order). Null stays null. */
  rank(options: { method?: RankMethod; descending?: boolean } = {}): Expr {
    return this.window({ fn: 'rank', method: options.method ?? 'min', descending: options.descending ?? false });
  }

  /** This aggregate or window function per partition, `orderBy` ordering each partition. Rows keep their place. */
  over(partitionBy: string | Expr | readonly (string | Expr)[] = [], options: { orderBy?: string | Expr | readonly (string | Expr)[]; descending?: boolean | readonly boolean[] } = {}): Expr {
    const nodes = (x: string | Expr | readonly (string | Expr)[] | undefined): Node[] => (x === undefined ? [] : (Array.isArray(x) ? x : [x]).map((e: string | Expr) => (typeof e === 'string' ? col(e).node : e.node)));
    const order = nodes(options.orderBy);
    const d = options.descending;
    return new Expr({ k: 'over', arg: this.node, partition: nodes(partitionBy), order, descending: order.map((_, i) => (Array.isArray(d) ? (d[i] ?? false) : ((d as boolean | undefined) ?? false))) });
  }

  private window(w: Omit<WinNode, 'k' | 'arg'>): Expr {
    return new Expr({ k: 'win', arg: this.node, ...w });
  }

  private aggregate(fn: AggFn): Expr {
    return new Expr({ k: 'agg', fn, arg: this.node });
  }

  /** Text methods. */
  get str(): { lower(): Expr; upper(): Expr; contains(pattern: string): Expr } {
    return {
      lower: () => this.op('str.lower'),
      upper: () => this.op('str.upper'),
      contains: (pattern: string) => this.op('str.contains', pattern),
    };
  }
}

/** A column of the frame, by name. */
export const col = (name: string): Expr => new Expr({ k: 'col', name });

/** The number of rows (of the frame, or of each group). */
export const len = (): Expr => new Expr({ k: 'agg', fn: 'len', arg: null });

/** A constant. A number that is an integer is `int`, any other number `real`. */
export const lit = (value: number | bigint | string | boolean | Uint8Array | null): Expr => new Expr({ k: 'lit', value });

// ------------------------------------------------------------------ resolving

const typeError = (scope: Scope, method: string, message: string): DfError => new DfError('SMALTDF_TYPE', `${scope.step}: ${method}: ${message}`);

function literal(value: Node & { k: 'lit' }): { plan: PlanExpr; type: DfType } {
  const v = value.value;
  if (v === null) return { plan: p.lit(null), type: 'null' };
  if (typeof v === 'boolean') return { plan: p.lit(v ? 1 : 0, 'int'), type: 'bool' };
  if (typeof v === 'bigint') return { plan: p.lit(v, 'int'), type: 'int' };
  if (typeof v === 'number') return { plan: p.lit(v, Number.isInteger(v) ? 'int' : 'real'), type: Number.isInteger(v) ? 'int' : 'real' };
  if (typeof v === 'string') return { plan: p.lit(v, 'text'), type: 'text' };
  return { plan: p.lit(v, 'blob'), type: 'blob' };
}

/** The result of arithmetic: int for two ints, real for any real, else known only when it runs. */
const arith = (a: DfType, b: DfType): DfType => (a === 'real' || b === 'real' ? 'real' : a === 'int' && b === 'int' ? 'int' : 'num');

/** Two types a comparison may compare: numbers with numbers, text with text, and so on. */
function comparable(a: DfType, b: DfType): boolean {
  if (a === 'null' || b === 'null' || a === 'any' || b === 'any') return true;
  if (isNumeric(a) && isNumeric(b)) return true;
  return a === b;
}

const OPS: Readonly<Record<string, string>> = {
  add: 'add_checked',
  sub: 'sub_checked',
  mul: 'mul_checked',
  floorDiv: 'div_floor',
  mod: 'mod_floor',
  eq: 'cmp_eq',
  ne: 'cmp_ne',
  lt: 'cmp_lt',
  le: 'cmp_le',
  gt: 'cmp_gt',
  ge: 'cmp_ge',
  eqMissing: 'cmp_is',
  round: 'round_half_even',
  'str.lower': 'lower_unicode',
  'str.upper': 'upper_unicode',
  'str.contains': 'regex_match',
};

const CASTS: Readonly<Record<CastType, string>> = { int: 'cast_integer_strict', real: 'cast_real_strict', text: 'cast_text', blob: 'cast_blob' };

/** `e` resolved against `scope`; errors name the frame method and the expression method. */
export function resolve(e: Expr | string, scope: Scope): Resolved {
  return resolveNode(typeof e === 'string' ? col(e).node : e.node, scope);
}

function withOrigin<T extends object>(x: T, origin: DfOrigin): T {
  return { ...x, origin };
}

function resolveNode(n: Node, scope: Scope): Resolved {
  switch (n.k) {
    case 'col': {
      const i = scope.columns.findIndex((c) => c.name === n.name);
      if (i < 0) throw new DfError('SMALTDF_SCHEMA', `${scope.step}: no column "${n.name}" in ${scope.source} (columns: ${scope.columns.map((c) => c.name).join(', ')})`);
      const c = scope.columns[i]!;
      return { plan: p.col(0, i, planType(c.type)), type: c.type, name: c.name };
    }
    case 'lit': {
      const l = literal(n);
      return { ...l, name: 'literal' };
    }
    case 'alias':
      return { ...resolveNode(n.arg, scope), name: n.name };
    case 'cast': {
      const a = resolveNode(n.arg, scope);
      if (a.type === 'bool' && n.to === 'int') return { ...a, type: 'int' };
      const fn = CASTS[n.to];
      return { plan: withOrigin(p.cast(fn, a.plan, n.to), { step: scope.step, method: 'cast' }), type: n.to, name: a.name };
    }
    case 'op':
      return resolveOp(n, scope);
    case 'agg':
      if (!scope.agg) throw new DfError('SMALTDF_TYPE', `${scope.step}: ${n.fn} is an aggregate: use it in groupBy(…).agg(…), in a select of aggregates only, or per row with .over(…)`);
      return scope.agg(n);
    case 'win':
    case 'over':
      if (!scope.win) throw new DfError('SMALTDF_TYPE', `${scope.step}: ${n.k === 'over' ? 'over' : n.fn} is a window: use it in select, withColumns or filter`);
      return scope.win(n);
  }
}

/** Whether `e` holds an aggregate. */
export function hasAggregate(e: Expr | string): boolean {
  const walk = (n: Node): boolean => {
    switch (n.k) {
      case 'agg':
        return true;
      case 'op':
        return n.args.some(walk);
      case 'cast':
      case 'alias':
        return walk(n.arg);
      default:
        return false;
    }
  };
  return typeof e !== 'string' && walk(e.node);
}

/** Whether `e` reads a column outside its aggregates (which a select of aggregates can't). */
export function readsColumns(e: Expr | string): boolean {
  const walk = (n: Node): boolean => {
    switch (n.k) {
      case 'col':
        return true;
      case 'op':
        return n.args.some(walk);
      case 'cast':
      case 'alias':
        return walk(n.arg);
      default:
        return false;
    }
  };
  return typeof e === 'string' || walk(e.node);
}

const AGG_FNS: Readonly<Record<AggFn, string>> = { sum: 'sum', mean: 'avg', min: 'min', max: 'max', count: 'count', len: 'count', first: 'first', last: 'last', median: 'median', std: 'stddev_samp', var: 'var_samp' };

/** An aggregate resolved against the rows it aggregates (`input`): its call, its smaltdf type, and its name. */
export function resolveAggregate(n: AggNode, input: Scope): { call: AggCall; type: DfType; name: string } {
  if (n.arg === null) return { call: p.agg('count', [], 'int', { star: true }), type: 'int', name: 'len' };
  // The argument is per row: no aggregate inside an aggregate.
  const a = resolveNode(n.arg, { ...input, agg: undefined });
  const numeric = isNumeric(a.type) || a.type === 'bool';
  const need = (ok: boolean, what: string): void => {
    if (!ok) throw typeError(input, n.fn, `${what}, not ${a.type}`);
  };
  let type: DfType;
  switch (n.fn) {
    case 'sum':
      need(numeric, 'takes numbers');
      type = a.type === 'real' ? 'real' : a.type === 'int' || a.type === 'bool' ? 'int' : 'num';
      break;
    case 'mean':
    case 'median':
    case 'std':
    case 'var':
      need(numeric, 'takes numbers');
      type = 'real';
      break;
    case 'count':
      type = 'int';
      break;
    default:
      type = a.type;
  }
  const call = p.agg(AGG_FNS[n.fn], [a.plan], planType(type));
  return { call: { ...call, origin: { step: input.step, method: n.fn } } as AggCall, type, name: a.name };
}

function resolveOp(n: Node & { k: 'op' }, scope: Scope): Resolved {
  const args = n.args.map((a) => resolveNode(a, scope));
  const [a, b] = args as [Resolved, Resolved | undefined];
  const m = n.method;
  const origin: DfOrigin = { step: scope.step, method: m };
  const out = (plan: PlanExpr, type: DfType): Resolved => ({ plan: withOrigin(plan, origin), type, name: a.name });
  const need = (ok: boolean, what: string): void => {
    if (!ok) throw typeError(scope, m, `${what}, not ${args.map((x) => x.type).join(' and ')}`);
  };
  switch (m) {
    case 'add':
    case 'sub':
    case 'mul':
      need(isNumeric(a.type) && isNumeric(b!.type), 'takes numbers');
      return out(p.call(OPS[m]!, [a.plan, b!.plan], planType(arith(a.type, b!.type))), arith(a.type, b!.type));
    case 'div':
      need(isNumeric(a.type) && isNumeric(b!.type), 'takes numbers');
      return out(p.call('div_float', [a.plan, b!.plan], 'real'), 'real');
    case 'floorDiv':
    case 'mod': {
      need(isNumeric(a.type) && isNumeric(b!.type), 'takes numbers');
      const t = a.type === 'int' && b!.type === 'int' ? 'int' : a.type === 'real' || b!.type === 'real' ? 'real' : 'num';
      return out(p.call(OPS[m]!, [a.plan, b!.plan], planType(t)), t);
    }
    case 'eq':
    case 'ne':
    case 'lt':
    case 'le':
    case 'gt':
    case 'ge':
    case 'eqMissing':
      need(comparable(a.type, b!.type), 'compares values of one kind');
      return out(p.call(OPS[m]!, [a.plan, b!.plan], 'int', 'binary'), 'bool');
    case 'and':
    case 'or':
      need(isBool(a.type) && isBool(b!.type), 'takes bool values');
      return out(m === 'and' ? p.and(a.plan, b!.plan) : p.or(a.plan, b!.plan), 'bool');
    case 'not':
      need(isBool(a.type), 'takes a bool value');
      return out(p.not(a.plan), 'bool');
    case 'isNull':
      return out(p.isNull(a.plan), 'bool');
    case 'isNotNull':
      return out(p.isNotNull(a.plan), 'bool');
    case 'round':
      need(isNumeric(a.type) && (b!.type === 'int' || b!.type === 'null'), 'takes a number and a whole number of digits');
      return out(p.call('round_half_even', [a.plan, b!.plan], 'real'), 'real');
    case 'str.lower':
    case 'str.upper':
      need(isText(a.type), 'takes text');
      return out(p.call(OPS[m]!, [a.plan], 'text'), 'text');
    case 'str.contains':
      need(isText(a.type) && b!.type === 'text', 'takes text and a pattern');
      return out(p.call('regex_match', [a.plan, b!.plan], 'int'), 'bool');
    default:
      throw new DfError('SMALTDF_TYPE', `${scope.step}: unknown method ${m}`);
  }
}

const isBool = (t: DfType): boolean => t === 'bool' || t === 'null' || t === 'any';
const isText = (t: DfType): boolean => t === 'text' || t === 'null' || t === 'any';

/** A window call, the window it is computed in, and how its result is read. */
export interface ResolvedWindow {
  readonly call: WindowCall;
  /** Partition, order and frame: calls with the same window share one. */
  readonly partition: readonly PlanExpr[];
  readonly order: readonly SortKey[];
  readonly frame: WindowFrame;
  readonly type: DfType;
  readonly name: string;
  /** The call's result as the expression's value, from its column `ref`. */
  readonly read: (ref: PlanExpr) => PlanExpr;
}

const WHOLE = p.frame('ROWS', p.unboundedPreceding, p.unboundedFollowing);
const RUNNING = p.frame('ROWS', p.unboundedPreceding, p.currentRow);
const RANKS: Readonly<Record<RankMethod, string>> = { min: 'rank', dense: 'dense_rank', ordinal: 'row_number' };

/** `n` (a window function, or an `over` of one or of an aggregate) resolved against the rows it runs over. */
export function resolveWindow(n: WinNode | OverNode, input: Scope): ResolvedWindow {
  const plain: Scope = { ...input, agg: undefined, win: undefined };
  const over = n.k === 'over' ? n : undefined;
  const target = over ? over.arg : n;
  if (target.k !== 'agg' && target.k !== 'win') throw new DfError('SMALTDF_TYPE', `${input.step}: over applies to one aggregate or window function (col('qty').sum().over('region')), not to an expression of them`);
  const partition = (over?.partition ?? []).map((x) => resolveNode(x, plain).plan);
  const order = (over?.order ?? []).map((x, i) => {
    const r = resolveNode(x, plain).plan;
    return over!.descending[i] ? p.desc(r, { nullsFirst: true }) : p.asc(r, { nullsFirst: true });
  });
  const origin: DfOrigin = { step: input.step, method: target.k === 'agg' ? target.fn : target.fn };
  const call = (fn: string, args: PlanExpr[], type: DfType, options: { star?: boolean } = {}): WindowCall => ({ ...p.windowCall(fn, args, planType(type), options), origin }) as WindowCall;
  const nullWhereNull = (arg: PlanExpr) => (ref: PlanExpr) => p.caseWhen([{ when: p.isNull(arg), then: p.lit(null) }], 'any', ref);

  if (target.k === 'agg') {
    // An aggregate per partition: over each partition's rows, ordered only where order matters (first, last).
    const a = resolveAggregate(target, plain);
    const ordered = target.fn === 'first' || target.fn === 'last';
    const sum = target.fn === 'sum';
    return {
      call: call(a.call.fn, [...a.call.args], a.type, { star: a.call.star }),
      partition,
      order: ordered ? order : [],
      frame: WHOLE,
      type: a.type,
      name: a.name,
      read: sum ? (ref) => p.call('coalesce', [ref, p.lit(0, a.type === 'real' ? 'real' : 'int')], planType(a.type)) : (ref) => ref,
    };
  }
  const arg = resolveNode(target.arg, plain);
  const need = (ok: boolean, what: string): void => {
    if (!ok) throw typeError(input, target.fn, `${what}, not ${arg.type}`);
  };
  switch (target.fn) {
    case 'cumSum':
    case 'cumMin':
    case 'cumMax': {
      if (target.fn === 'cumSum') need(isNumeric(arg.type) || arg.type === 'bool', 'takes numbers');
      const type: DfType = target.fn === 'cumSum' ? (arg.type === 'real' ? 'real' : arg.type === 'int' || arg.type === 'bool' ? 'int' : 'num') : arg.type;
      const fn = target.fn === 'cumSum' ? 'sum' : target.fn === 'cumMin' ? 'min' : 'max';
      return { call: call(fn, [arg.plan], type), partition, order, frame: RUNNING, type, name: arg.name, read: nullWhereNull(arg.plan) };
    }
    case 'cumCount':
      return { call: call('count', [arg.plan], 'int'), partition, order, frame: RUNNING, type: 'int', name: arg.name, read: (ref) => ref };
    case 'shift': {
      const k = target.n ?? 1;
      const fill = resolveNode(target.fill ?? { k: 'lit', value: null }, plain);
      if (k === 0) return { call: call('first_value', [arg.plan], arg.type), partition, order, frame: p.frame('ROWS', p.currentRow, p.currentRow), type: arg.type, name: arg.name, read: (ref) => ref };
      return { call: call(k > 0 ? 'lag' : 'lead', [arg.plan, p.lit(Math.abs(k)), fill.plan], arg.type), partition, order, frame: RUNNING, type: arg.type, name: arg.name, read: (ref) => ref };
    }
    case 'rank': {
      if (over && over.order.length) throw new DfError('SMALTDF_TYPE', `${input.step}: rank orders by its own value: give over() no orderBy`);
      // Nulls last, so they take no rank of the values; their rank is null.
      const key = target.descending ? p.desc(arg.plan, { nullsFirst: false }) : p.asc(arg.plan, { nullsFirst: false });
      return { call: call(RANKS[target.method ?? 'min'], [], 'int'), partition, order: [key], frame: RUNNING, type: 'int', name: arg.name, read: nullWhereNull(arg.plan) };
    }
  }
}
