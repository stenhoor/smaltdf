// Expressions: the Polars expression API (`col('a').gt(1).and(col('b').isNull())`) over an immutable tree. Method
// names are Polars' Python names in camelCase (`is_null` → `isNull`, `str.to_uppercase` → `str.toUppercase`).
// Nothing runs here: expressions become SQL when a frame is collected (compile.ts).
import { String as Str, type DataType } from './dtypes.js';
import { SmaltdfError, needsEngine } from './errors.js';
import type { LitValue } from './values.js';

export type RankMethod = 'average' | 'min' | 'max' | 'dense' | 'ordinal';
export type BinOp = '+' | '-' | '*' | '/' | '%' | '//' | '=' | '<>' | '<' | '<=' | '>' | '>=' | 'AND' | 'OR' | 'IS' | 'IS NOT' | '||';
export type AggFn = 'sum' | 'mean' | 'min' | 'max' | 'count' | 'len' | 'n_unique' | 'var';

export type Node =
  | { k: 'col'; names: string[] | '*'; exclude: string[] }
  | { k: 'lit'; v: LitValue }
  | { k: 'bin'; op: BinOp; l: Node; r: Node }
  | { k: 'not'; x: Node }
  | { k: 'neg'; x: Node }
  | { k: 'isnull'; x: Node; not: boolean }
  | { k: 'fn'; name: string; args: Node[]; opts?: Record<string, unknown> }
  | { k: 'agg'; fn: AggFn; x: Node | null; ddof?: number }
  | { k: 'alias'; x: Node; name: string }
  | { k: 'rename'; x: Node; how: 'prefix' | 'suffix'; s: string }
  | { k: 'cast'; x: Node; dtype: DataType }
  | { k: 'case'; whens: [Node, Node][]; otherwise: Node | null }
  | { k: 'in'; x: Node; values: LitValue[] }
  | { k: 'over'; x: Node; partition: Node[] }
  | { k: 'rank'; x: Node; method: RankMethod; descending: boolean };

/** What a function or method accepts in place of an expression: a column name, or an expression. */
export type IntoExpr = Expr | string;
/** What an operand accepts: an expression, or a literal value. */
export type ExprOrValue = Expr | LitValue;

export class Expr {
  /** @internal */
  constructor(readonly node: Node) {}

  // ------------------------------------------------------------ naming
  alias(name: string): Expr {
    return new Expr({ k: 'alias', x: this.node, name });
  }
  /** `expr.name.suffix('_x')`, `expr.name.prefix('x_')`, `expr.name.keep()`. */
  get name(): ExprName {
    return new ExprName(this);
  }

  // ------------------------------------------------------------ arithmetic
  add(other: ExprOrValue): Expr {
    return this.bin('+', other);
  }
  sub(other: ExprOrValue): Expr {
    return this.bin('-', other);
  }
  mul(other: ExprOrValue): Expr {
    return this.bin('*', other);
  }
  /** Division as smaltdb's `/` does it: integer operands give an integer (see docs/divergences.md). */
  truediv(other: ExprOrValue): Expr {
    return this.bin('/', other);
  }
  /** Division rounded down to an integer, as Polars `//`. */
  floordiv(other: ExprOrValue): Expr {
    return this.bin('//', other);
  }
  /** The remainder as smaltdb's `%` gives it (the sign of the dividend). */
  mod(other: ExprOrValue): Expr {
    return this.bin('%', other);
  }
  neg(): Expr {
    return new Expr({ k: 'neg', x: this.node });
  }
  abs(): Expr {
    return this.fn('abs');
  }
  sign(): Expr {
    return this.fn('sign');
  }
  round(decimals = 0): Expr {
    return this.fn('round', [lit(decimals)]);
  }
  floor(): Expr {
    return this.fn('floor');
  }
  ceil(): Expr {
    return this.fn('ceil');
  }
  clip(lowerBound?: ExprOrValue | null, upperBound?: ExprOrValue | null): Expr {
    let e: Expr = this;
    if (lowerBound != null) e = when(e.lt(lowerBound)).then(toExpr(lowerBound)).otherwise(e);
    if (upperBound != null) e = when(e.gt(upperBound)).then(toExpr(upperBound)).otherwise(e);
    return e;
  }
  sqrt(): Expr {
    throw needsEngine('sqrt', 'a sqrt() function (or plugin-registered scalar functions)');
  }
  pow(exponent: number): Expr {
    if (!Number.isInteger(exponent) || exponent < 0 || exponent > 16) {
      throw needsEngine(`pow(${exponent})`, 'a pow() function (or plugin-registered scalar functions)');
    }
    if (exponent === 0) return when(this.isNull()).then(lit(null)).otherwise(lit(1));
    let e: Expr = this;
    for (let i = 1; i < exponent; i++) e = e.mul(this);
    return e;
  }

  // ------------------------------------------------------------ comparison
  eq(other: ExprOrValue): Expr {
    return this.bin('=', other);
  }
  ne(other: ExprOrValue): Expr {
    return this.bin('<>', other);
  }
  lt(other: ExprOrValue): Expr {
    return this.bin('<', other);
  }
  le(other: ExprOrValue): Expr {
    return this.bin('<=', other);
  }
  gt(other: ExprOrValue): Expr {
    return this.bin('>', other);
  }
  ge(other: ExprOrValue): Expr {
    return this.bin('>=', other);
  }
  /** Equality where NULL equals NULL (never NULL itself). */
  eqMissing(other: ExprOrValue): Expr {
    return this.bin('IS', other);
  }
  neMissing(other: ExprOrValue): Expr {
    return this.bin('IS NOT', other);
  }
  isBetween(lowerBound: ExprOrValue, upperBound: ExprOrValue, closed: 'both' | 'left' | 'right' | 'none' = 'both'): Expr {
    const lo = closed === 'both' || closed === 'left' ? this.ge(lowerBound) : this.gt(lowerBound);
    const hi = closed === 'both' || closed === 'right' ? this.le(upperBound) : this.lt(upperBound);
    return lo.and(hi);
  }
  isIn(values: readonly LitValue[]): Expr {
    return new Expr({ k: 'in', x: this.node, values: [...values] });
  }

  // ------------------------------------------------------------ logic and nulls
  and(...others: ExprOrValue[]): Expr {
    return others.reduce<Expr>((e, o) => e.bin('AND', o), this);
  }
  or(...others: ExprOrValue[]): Expr {
    return others.reduce<Expr>((e, o) => e.bin('OR', o), this);
  }
  not(): Expr {
    return new Expr({ k: 'not', x: this.node });
  }
  isNull(): Expr {
    return new Expr({ k: 'isnull', x: this.node, not: false });
  }
  isNotNull(): Expr {
    return new Expr({ k: 'isnull', x: this.node, not: true });
  }
  fillNull(value: ExprOrValue): Expr {
    return this.fn('coalesce', [toExpr(value)]);
  }
  cast(dtype: DataType): Expr {
    return new Expr({ k: 'cast', x: this.node, dtype });
  }

  // ------------------------------------------------------------ aggregation
  sum(): Expr {
    return this.agg('sum');
  }
  mean(): Expr {
    return this.agg('mean');
  }
  min(): Expr {
    return this.agg('min');
  }
  max(): Expr {
    return this.agg('max');
  }
  /** The number of non-NULL values. */
  count(): Expr {
    return this.agg('count');
  }
  /** The number of values, NULLs included. */
  len(): Expr {
    return this.agg('len');
  }
  /** The number of distinct values; NULL counts as one value, as in Polars. */
  nUnique(): Expr {
    return this.agg('n_unique');
  }
  var(ddof = 1): Expr {
    return new Expr({ k: 'agg', fn: 'var', x: this.node, ddof });
  }
  std(_ddof = 1): Expr {
    throw needsEngine('std', 'a sqrt() function or a stddev() aggregate');
  }
  median(): Expr {
    throw needsEngine('median', 'a median() aggregate (or plugin-registered aggregate functions)');
  }
  quantile(_q: number): Expr {
    throw needsEngine('quantile', 'a percentile aggregate (or plugin-registered aggregate functions)');
  }
  first(): Expr {
    throw needsEngine('first', 'an order-preserving first() aggregate');
  }
  last(): Expr {
    throw needsEngine('last', 'an order-preserving last() aggregate');
  }

  // ------------------------------------------------------------ windows
  /** Evaluate over groups: aggregates are computed per group and broadcast to its rows. */
  over(...partitionBy: (IntoExpr | IntoExpr[])[]): Expr {
    const partition = partitionBy.flat().map((p) => toColumn(p).node);
    if (partition.length === 0) throw new SmaltdfError('InvalidOperationError', 'over() needs at least one column');
    return new Expr({ k: 'over', x: this.node, partition });
  }
  rank(method: RankMethod = 'average', options: { descending?: boolean } = {}): Expr {
    return new Expr({ k: 'rank', x: this.node, method, descending: options.descending ?? false });
  }

  // ------------------------------------------------------------ namespaces
  get str(): ExprStr {
    return new ExprStr(this);
  }

  // ------------------------------------------------------------ internals
  /** @internal */
  bin(op: BinOp, other: ExprOrValue): Expr {
    return new Expr({ k: 'bin', op, l: this.node, r: toExpr(other).node });
  }
  /** @internal */
  fn(name: string, args: Expr[] = [], opts?: Record<string, unknown>): Expr {
    return new Expr({ k: 'fn', name, args: [this.node, ...args.map((a) => a.node)], opts });
  }
  private agg(fn: AggFn): Expr {
    return new Expr({ k: 'agg', fn, x: this.node });
  }
  /** Polars-style text form, for messages and debugging. */
  toString(): string {
    return show(this.node);
  }
}

/** `expr.name`: change an expression's output name. */
export class ExprName {
  constructor(private readonly e: Expr) {}
  prefix(prefix: string): Expr {
    return new Expr({ k: 'rename', x: this.e.node, how: 'prefix', s: prefix });
  }
  suffix(suffix: string): Expr {
    return new Expr({ k: 'rename', x: this.e.node, how: 'suffix', s: suffix });
  }
  /** The name of the root column, dropping any alias. */
  keep(): Expr {
    const strip = (n: Node): Node => (n.k === 'alias' ? strip(n.x) : n);
    return new Expr(strip(this.e.node));
  }
}

/** Characters that make a Polars pattern a regular expression rather than a literal string. */
const REGEX_META = /[\\^$.|?*+()[\]{}]/;

/** `expr.str`: string functions. */
export class ExprStr {
  constructor(private readonly e: Expr) {}
  lenChars(): Expr {
    return this.e.fn('length');
  }
  lenBytes(): Expr {
    return this.e.fn('octet_length');
  }
  toUppercase(): Expr {
    return this.e.fn('upper');
  }
  toLowercase(): Expr {
    return this.e.fn('lower');
  }
  /** Whether the text contains `pattern`. Only literal patterns run until smaltdb has regular expressions. */
  contains(pattern: string, options: { literal?: boolean } = {}): Expr {
    literalOnly('str.contains', pattern, options.literal);
    return this.e.fn('str_contains', [lit(pattern)]);
  }
  startsWith(prefix: string): Expr {
    return this.e.fn('str_starts_with', [lit(prefix)]);
  }
  endsWith(suffix: string): Expr {
    return this.e.fn('str_ends_with', [lit(suffix)]);
  }
  stripChars(characters?: string | null): Expr {
    return this.e.fn('trim', characters == null ? [] : [lit(characters)]);
  }
  stripCharsStart(characters?: string | null): Expr {
    return this.e.fn('ltrim', characters == null ? [] : [lit(characters)]);
  }
  stripCharsEnd(characters?: string | null): Expr {
    return this.e.fn('rtrim', characters == null ? [] : [lit(characters)]);
  }
  /** Replace the first match of `pattern` (literal patterns only for now). */
  replace(pattern: string, value: string, options: { literal?: boolean } = {}): Expr {
    literalOnly('str.replace', pattern, options.literal);
    return this.e.fn('str_replace_first', [lit(pattern), lit(value)]);
  }
  /** Replace every match of `pattern` (literal patterns only for now). */
  replaceAll(pattern: string, value: string, options: { literal?: boolean } = {}): Expr {
    literalOnly('str.replace_all', pattern, options.literal);
    return this.e.fn('replace', [lit(pattern), lit(value)]);
  }
  /** Characters from `offset` (0-based; negative counts from the end), `length` of them or to the end. */
  slice(offset: number, length?: number | null): Expr {
    return this.e.fn('str_slice', [lit(offset), lit(length ?? null)]);
  }
  head(n: number): Expr {
    if (n < 0) throw needsEngine('str.head with a negative n', 'more string functions');
    return this.slice(0, n);
  }
  tail(n: number): Expr {
    if (n < 0) throw needsEngine('str.tail with a negative n', 'more string functions');
    return this.e.fn('str_tail', [lit(n)]);
  }
}

function literalOnly(fn: string, pattern: string, literal: boolean | undefined): void {
  if (!literal && REGEX_META.test(pattern)) {
    throw needsEngine(`${fn} with a regular expression (${JSON.stringify(pattern)}); pass { literal: true } to match it as text`, 'a regexp() function');
  }
}

// ------------------------------------------------------------------ constructors

/** A column, several columns (`col('a', 'b')`, `col(['a', 'b'])`), or every column (`col('*')`). */
export function col(...names: (string | string[])[]): Expr {
  const flat = names.flat();
  if (flat.length === 0) throw new SmaltdfError('InvalidOperationError', 'col() needs a column name');
  if (flat.length === 1 && flat[0] === '*') return new Expr({ k: 'col', names: '*', exclude: [] });
  return new Expr({ k: 'col', names: flat, exclude: [] });
}

/** Every column. */
export function all(): Expr {
  return col('*');
}

/** Every column except these. */
export function exclude(...names: (string | string[])[]): Expr {
  return new Expr({ k: 'col', names: '*', exclude: names.flat() });
}

/** A literal value. */
export function lit(value: LitValue): Expr {
  return new Expr({ k: 'lit', v: value });
}

/** The number of rows (`pl.len()`). */
export function len(): Expr {
  return new Expr({ k: 'agg', fn: 'len', x: null });
}

export const sum = (...names: string[]): Expr => col(...names).sum();
export const mean = (...names: string[]): Expr => col(...names).mean();
export const min = (...names: string[]): Expr => col(...names).min();
export const max = (...names: string[]): Expr => col(...names).max();
export const count = (...names: string[]): Expr => col(...names).count();
export const nUnique = (...names: string[]): Expr => col(...names).nUnique();

/** Text from several expressions joined by `separator`; NULL when any part is NULL. */
export function concatStr(exprs: IntoExpr[], options: { separator?: string } = {}): Expr {
  if (exprs.length === 0) throw new SmaltdfError('InvalidOperationError', 'concatStr() needs at least one expression');
  const sep = options.separator ?? '';
  const parts = exprs.map(toColumn);
  let e = parts[0].cast(Str);
  for (const p of parts.slice(1)) e = sep === '' ? e.bin('||', p) : e.bin('||', lit(sep)).bin('||', p);
  return e;
}

/** `when(cond).then(a).when(cond2).then(b).otherwise(c)`. */
export function when(...predicates: ExprOrValue[]): When {
  return new When([], andAll(predicates));
}

export class When {
  constructor(
    private readonly done: [Node, Node][],
    private readonly cond: Node,
  ) {}
  then(value: ExprOrValue): Then {
    return new Then([...this.done, [this.cond, toExprOrString(value).node]]);
  }
}

/** A `when … then` chain; it is an expression itself (NULL where no branch matches). */
export class Then extends Expr {
  constructor(private readonly whens: [Node, Node][]) {
    super({ k: 'case', whens, otherwise: null });
  }
  when(...predicates: ExprOrValue[]): When {
    return new When(this.whens, andAll(predicates));
  }
  otherwise(value: ExprOrValue): Expr {
    return new Expr({ k: 'case', whens: this.whens, otherwise: toExprOrString(value).node });
  }
}

function andAll(predicates: ExprOrValue[]): Node {
  if (predicates.length === 0) throw new SmaltdfError('InvalidOperationError', 'when() needs a condition');
  const [first, ...rest] = predicates.map(toExpr);
  return first.and(...rest).node;
}

/** Operands: an Expr as is, anything else a literal (`col('a').eq('x')` compares with the text 'x'). */
export function toExpr(v: ExprOrValue): Expr {
  return v instanceof Expr ? v : lit(v);
}

/** Frame methods and `then`/`otherwise`: a string is a column name, as in Polars. */
export function toColumn(v: IntoExpr): Expr {
  return typeof v === 'string' ? col(v) : v;
}

function toExprOrString(v: ExprOrValue): Expr {
  return typeof v === 'string' ? col(v) : toExpr(v);
}

function show(n: Node): string {
  switch (n.k) {
    case 'col':
      return n.names === '*' ? (n.exclude.length ? `exclude(${n.exclude.join(', ')})` : 'col("*")') : `col(${n.names.map((s) => JSON.stringify(s)).join(', ')})`;
    case 'lit':
      return typeof n.v === 'bigint' ? `${n.v}` : JSON.stringify(n.v) ?? String(n.v);
    case 'bin':
      return `[(${show(n.l)}) ${n.op} (${show(n.r)})]`;
    case 'not':
      return `${show(n.x)}.not()`;
    case 'neg':
      return `-(${show(n.x)})`;
    case 'isnull':
      return `${show(n.x)}.${n.not ? 'isNotNull' : 'isNull'}()`;
    case 'fn':
      return `${show(n.args[0])}.${n.name}(${n.args.slice(1).map(show).join(', ')})`;
    case 'agg':
      return n.x ? `${show(n.x)}.${n.fn}()` : 'len()';
    case 'alias':
      return `${show(n.x)}.alias(${JSON.stringify(n.name)})`;
    case 'rename':
      return `${show(n.x)}.name.${n.how}(${JSON.stringify(n.s)})`;
    case 'cast':
      return `${show(n.x)}.cast(${n.dtype.name})`;
    case 'case':
      return `when(…)${n.whens.length > 1 ? `×${n.whens.length}` : ''}${n.otherwise ? '.otherwise(…)' : ''}`;
    case 'in':
      return `${show(n.x)}.isIn([…${n.values.length}])`;
    case 'over':
      return `${show(n.x)}.over(${n.partition.map(show).join(', ')})`;
    case 'rank':
      return `${show(n.x)}.rank(${JSON.stringify(n.method)})`;
  }
}
