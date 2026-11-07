/**
 * Expressions (REFERENCE.md "Expressions"): a description of a value per row, resolved against a frame's columns when
 * its plan is built. Each method maps to the engine operation that means what smaltdf's reference says.
 */
import * as p from 'smaltdb/plan';
import type { PlanExpr } from 'smaltdb/plan';
import { DfError, type DfOrigin } from './errors.js';
import { type DfColumn, type DfType, isNumeric, planType } from './types.js';

/** A value an expression method takes: an expression, or a literal (`lit` is applied). */
export type ExprLike = Expr | number | bigint | string | boolean | Uint8Array | null;

type Node =
  | { readonly k: 'col'; readonly name: string }
  | { readonly k: 'lit'; readonly value: number | bigint | string | boolean | Uint8Array | null }
  | { readonly k: 'op'; readonly method: string; readonly args: readonly Node[] }
  | { readonly k: 'cast'; readonly to: CastType; readonly arg: Node }
  | { readonly k: 'alias'; readonly name: string; readonly arg: Node };

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
  }
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
