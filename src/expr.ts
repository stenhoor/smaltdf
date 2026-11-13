/**
 * Expressions (docs/reference/expressions/): a description of a value per row, resolved against a frame's columns when
 * its plan is built. Each method maps to the engine operation that means what smaltdf's reference says.
 */
import * as p from 'smaltdb/plan';
import type { AggCall, EachAggCall, PlanExpr, SortKey, WindowCall, WindowFrame } from 'smaltdb/plan';
import { DfError, type DfOrigin } from './errors.js';
import { type DfColumn, type DfType, type TemporalType, isNumeric, isTemporal, listElement, planType, structFields } from './types.js';

/** A value an expression method takes: an expression, or a literal (`lit` is applied). */
export type ExprLike = Expr | number | bigint | string | boolean | Uint8Array | Date | null;

type Node =
  | { readonly k: 'col'; readonly name: string }
  | { readonly k: 'lit'; readonly value: number | bigint | string | boolean | Uint8Array | Date | null }
  | { readonly k: 'op'; readonly method: string; readonly args: readonly Node[] }
  | { readonly k: 'cast'; readonly to: CastType; readonly arg: Node }
  | { readonly k: 'alias'; readonly name: string; readonly arg: Node }
  | ElementNode
  | { readonly k: 'struct'; readonly names: readonly string[]; readonly args: readonly Node[] }
  | AggNode
  | WinNode
  | OverNode;

/** @internal An element of the list a `list.eval`, `list.filter` or `list.agg` body runs over, `depth` lists out. */
export interface ElementNode {
  readonly k: 'element';
  readonly part: 'value' | 'position';
  readonly depth: number;
}

/** Window functions (docs/reference/windows/): over the frame's rows in order, or a partition's. */
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

/** The aggregates (docs/reference/aggregates/). */
export type AggFn = 'sum' | 'mean' | 'min' | 'max' | 'count' | 'len' | 'first' | 'last' | 'median' | 'std' | 'var' | 'implode';

/** @internal An aggregate of `arg` (none for `len`). */
export interface AggNode {
  readonly k: 'agg';
  readonly fn: AggFn;
  readonly arg: Node | null;
}

export type CastType = 'int' | 'real' | 'text' | 'blob' | 'date' | 'datetime';

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
  /**
   * Inside `list.eval`, `list.filter` and `list.agg` bodies: the lists they run over, the innermost last, with their
   * element type and whether `element()` reads them there (not in a `list.agg` body outside its aggregates).
   */
  readonly elements?: readonly { readonly type: DfType; readonly readable: boolean; readonly method: string }[];
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
  /** The position of `element()` in its list, from 0. Only on `element()`. */
  position(): Expr {
    if (this.node.k !== 'element') throw new DfError('SMALTDF_TYPE', 'position: only element() has a position (element().position())');
    return new Expr({ ...this.node, part: 'position' });
  }
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
  /** The group's values as a list, in the group's order, nulls included. */
  implode(): Expr { return this.aggregate('implode'); }
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
  get str(): { lower(): Expr; upper(): Expr; contains(pattern: string): Expr; toDate(format?: string): Expr; toDatetime(format?: string): Expr } {
    return {
      lower: () => this.op('str.lower'),
      upper: () => this.op('str.upper'),
      contains: (pattern: string) => this.op('str.contains', pattern),
      toDate: (format?: string) => (format === undefined ? this.op('str.toDate') : this.op('str.toDate', format)),
      toDatetime: (format?: string) => (format === undefined ? this.op('str.toDatetime') : this.op('str.toDatetime', format)),
    };
  }

  /** List methods (docs/reference/list/). */
  get list(): ListMethods {
    const m = (name: string, ...args: ExprLike[]) => this.op(`list.${name}`, ...args);
    const body = (method: string, e: Expr): Expr => {
      if (!(e instanceof Expr)) throw new DfError('SMALTDF_TYPE', `list.${method}: takes an expression of element()`);
      return e;
    };
    const whole = (method: string, what: string, n: number): number => {
      if (!Number.isSafeInteger(n)) throw new DfError('SMALTDF_RANGE', `list.${method}: expected a whole number for ${what}, not ${n}`);
      return n;
    };
    return {
      len: () => m('len'),
      get: (index: ExprLike, options: { nullOnOob?: boolean } = {}) => (options.nullOnOob === false ? m('get', index, true) : m('get', index)),
      first: () => m('get', 0),
      last: () => m('get', -1),
      contains: (item: ExprLike, options: { nullsEqual?: boolean } = {}) => (options.nullsEqual === false ? m('contains', item, false) : m('contains', item)),
      slice: (offset: ExprLike, length?: ExprLike) => (length === undefined ? m('slice', offset) : m('slice', offset, length)),
      head: (n = 5) => m('slice', 0, n),
      tail: (n = 5) => m('slice', -n),
      concat: (other: ExprLike) => m('concat', other),
      join: (separator: string, options: { ignoreNulls?: boolean } = {}) => (options.ignoreNulls === false ? m('join', separator, true) : m('join', separator)),
      sort: (options: { descending?: boolean; nullsLast?: boolean } = {}) => m('sort', options.descending ?? false, options.nullsLast ?? false),
      unique: () => m('unique'),
      reverse: () => m('reverse'),
      sum: () => m('sum'),
      mean: () => m('mean'),
      min: () => m('min'),
      max: () => m('max'),
      median: () => m('median'),
      std: (ddof = 1) => m('std', whole('std', 'ddof', ddof)),
      var: (ddof = 1) => m('var', whole('var', 'ddof', ddof)),
      nUnique: () => m('nUnique'),
      argMin: () => m('argMin'),
      argMax: () => m('argMax'),
      countMatches: (item: ExprLike) => m('countMatches', item),
      all: () => m('all'),
      any: () => m('any'),
      dropNulls: () => m('dropNulls'),
      shift: (n: ExprLike = 1) => m('shift', n),
      diff: (n = 1) => m('diff', whole('diff', 'n', n)),
      gather: (indices: ExprLike, options: { nullOnOob?: boolean } = {}) => (options.nullOnOob === false ? m('gather', indices, true) : m('gather', indices)),
      gatherEvery: (n: number, offset = 0) => m('gatherEvery', whole('gatherEvery', 'n', n), whole('gatherEvery', 'offset', offset)),
      sample: (n: number, options: { withReplacement?: boolean; seed?: number } = {}) =>
        options.seed === undefined
          ? m('sample', whole('sample', 'n', n), options.withReplacement ?? false)
          : m('sample', whole('sample', 'n', n), options.withReplacement ?? false, whole('sample', 'seed', options.seed)),
      item: () => m('item'),
      setUnion: (other: ExprLike) => m('setUnion', other),
      setIntersection: (other: ExprLike) => m('setIntersection', other),
      setDifference: (other: ExprLike) => m('setDifference', other),
      setSymmetricDifference: (other: ExprLike) => m('setSymmetricDifference', other),
      toStruct: (fields: readonly string[]) => {
        if (!Array.isArray(fields) || fields.length === 0) throw new DfError('SMALTDF_TYPE', 'list.toStruct: expected one field name or more');
        for (const f of fields) checkFieldName('list.toStruct', f);
        return m('toStruct', ...fields);
      },
      eval: (expr: Expr) => m('eval', body('eval', expr)),
      filter: (predicate: Expr) => m('filter', body('filter', predicate)),
      agg: (expr: Expr) => m('agg', body('agg', expr)),
    };
  }

  /** Struct methods. */
  get struct(): StructMethods {
    const names = (method: string, xs: readonly string[]): readonly string[] => {
      for (const n of xs) if (typeof n !== 'string') throw new DfError('SMALTDF_TYPE', `struct.${method}: expected field names`);
      return xs;
    };
    return {
      field: (name: string) => this.op('struct.field', name),
      withFields: (fields: Readonly<Record<string, ExprLike>>) => {
        const [ns, args] = fieldsOf('struct.withFields', fields);
        return new Expr({ k: 'op', method: 'struct.withFields', args: [this.node, { k: 'struct', names: ns, args }] });
      },
      renameFields: (to: readonly string[]) => this.op('struct.renameFields', ...names('renameFields', to)),
      drop: (...fields: string[]) => this.op('struct.drop', ...names('drop', fields)),
      select: (...fields: string[]) => this.op('struct.select', ...names('select', fields)),
      jsonEncode: () => this.op('struct.jsonEncode'),
    };
  }

  /** Date and time methods (docs/reference/dt/). */
  get dt(): DtMethods {
    const part = (name: string) => () => this.op(`dt.${name}`);
    return {
      year: part('year'),
      month: part('month'),
      day: part('day'),
      weekday: part('weekday'),
      ordinalDay: part('ordinalDay'),
      hour: part('hour'),
      minute: part('minute'),
      second: part('second'),
      microsecond: part('microsecond'),
      date: part('date'),
      truncate: (every: string) => this.op('dt.truncate', every),
      offsetBy: (by: ExprLike) => this.op('dt.offsetBy', by),
      strftime: (format: string) => this.op('dt.strftime', format),
      toZone: (zone: ExprLike) => this.op('dt.toZone', zone),
      fromZone: (zone: ExprLike, options: { ambiguous?: 'earliest' | 'latest' | 'raise' } = {}) =>
        options.ambiguous === undefined ? this.op('dt.fromZone', zone) : this.op('dt.fromZone', zone, options.ambiguous),
      zoneOffset: (zone: ExprLike) => this.op('dt.zoneOffset', zone),
    };
  }
}

/** The `list` methods of an expression of lists. */
export interface ListMethods {
  /** The number of elements. */
  len(): Expr;
  /** The element at `index` (from 0; negative from the end): null out of range, or an error with `nullOnOob: false`. */
  get(index: ExprLike, options?: { nullOnOob?: boolean }): Expr;
  first(): Expr;
  last(): Expr;
  /** Whether an element equals `item`; a null `item` finds null elements, unless `nullsEqual` is false (then null). */
  contains(item: ExprLike, options?: { nullsEqual?: boolean }): Expr;
  /** The elements from `offset` (negative from the end), `length` of them or to the end. */
  slice(offset: ExprLike, length?: ExprLike): Expr;
  head(n?: number): Expr;
  tail(n?: number): Expr;
  /** This list, then `other`. */
  concat(other: ExprLike): Expr;
  /** The non-null elements as text, joined by `separator`; with `ignoreNulls: false`, null if an element is null. */
  join(separator: string, options?: { ignoreNulls?: boolean }): Expr;
  /** The elements sorted, nulls first (last with `nullsLast`). */
  sort(options?: { descending?: boolean; nullsLast?: boolean }): Expr;
  /** The elements without repeats, the first of each, in order. */
  unique(): Expr;
  reverse(): Expr;
  /** Over the non-null elements: the sum (0 for none), the mean, the least and the greatest. */
  sum(): Expr;
  mean(): Expr;
  min(): Expr;
  max(): Expr;
  /** The median of the non-null elements; null for none. */
  median(): Expr;
  /** The standard deviation of the non-null elements, `ddof` (default 1) degrees of freedom taken away. */
  std(ddof?: number): Expr;
  /** The variance of the non-null elements, `ddof` (default 1) degrees of freedom taken away. */
  var(ddof?: number): Expr;
  /** The number of distinct elements, null counting as one. */
  nUnique(): Expr;
  /** The position of the smallest non-null element, the first of equals; null for none. */
  argMin(): Expr;
  /** The position of the largest non-null element, the first of equals; null for none. */
  argMax(): Expr;
  /** The number of elements equal to `item` (null counts the null elements). */
  countMatches(item: ExprLike): Expr;
  /** Whether every non-null element is true (true for none). */
  all(): Expr;
  /** Whether any non-null element is true (false for none). */
  any(): Expr;
  /** The non-null elements. */
  dropNulls(): Expr;
  /** The elements moved `n` places later (earlier for negative `n`), nulls filling the places left. */
  shift(n?: ExprLike): Expr;
  /** Each element less the one `n` places before it; null for the first `n`. */
  diff(n?: number): Expr;
  /** The elements at a list of positions: null out of range, or an error with `nullOnOob: false`. */
  gather(indices: ExprLike, options?: { nullOnOob?: boolean }): Expr;
  /** Every `n`-th element, from `offset`. */
  gatherEvery(n: number, offset?: number): Expr;
  /** `n` elements chosen at random (in the list's order without replacement); a `seed` gives the same choice each time. */
  sample(n: number, options?: { withReplacement?: boolean; seed?: number }): Expr;
  /** The one element of a list of one; any other length is an error. */
  item(): Expr;
  /** The elements of either list, each once, in first-appearance order. */
  setUnion(other: ExprLike): Expr;
  /** The elements of both lists, each once, in this list's order. */
  setIntersection(other: ExprLike): Expr;
  /** The elements of this list that aren't in `other`, each once, in order. */
  setDifference(other: ExprLike): Expr;
  /** The elements of one list but not both, each once: this list's, then `other`'s. */
  setSymmetricDifference(other: ExprLike): Expr;
  /** A struct of the elements, by position, named `fields`: a missing element is null. */
  toStruct(fields: readonly string[]): Expr;
  /** The list of `expr` for each element: `element()` is the element, and `col` reads the row. */
  eval(expr: Expr): Expr;
  /** The elements for which `predicate` is true, in order. */
  filter(predicate: Expr): Expr;
  /** `expr` over aggregates of the elements: `list.agg(element().sum().div(len()))`. */
  agg(expr: Expr): Expr;
}

/** The `struct` methods of an expression of structs. */
export interface StructMethods {
  /** A field, by name. */
  field(name: string): Expr;
  /** The struct with fields added, or replaced where a name is taken: `{ name: expr }`, in order. */
  withFields(fields: Readonly<Record<string, ExprLike>>): Expr;
  /** The same values under new field names, one per field, in order. */
  renameFields(names: readonly string[]): Expr;
  /** The struct without these fields. */
  drop(...fields: string[]): Expr;
  /** A struct of these fields, in this order. */
  select(...fields: string[]): Expr;
  /** The struct as JSON text: `{"x":1,"y":2.5}`. */
  jsonEncode(): Expr;
}

/** The `dt` methods of an expression of dates and times. */
export interface DtMethods {
  /** The year of a `date` or `datetime`. */
  year(): Expr;
  month(): Expr;
  day(): Expr;
  /** ISO weekday: Monday is 1, Sunday 7. */
  weekday(): Expr;
  /** The day of the year, from 1. */
  ordinalDay(): Expr;
  /** The hour of a `datetime` or `time`. */
  hour(): Expr;
  minute(): Expr;
  second(): Expr;
  /** The µs within the second. */
  microsecond(): Expr;
  /** The date of a `datetime`. */
  date(): Expr;
  /** Truncated to the start of `every`: `1y`, `1q`, `1mo`, `1w` (Monday), `1d`, `1h`, `1m`, `1s`, `1ms`, `1us`. */
  truncate(every: string): Expr;
  /** Moved by text such as `1mo`, `-2d` or `1y3mo` (months keep the day, or take a shorter month's last), or a duration. */
  offsetBy(by: ExprLike): Expr;
  /** Text written with a `strftime` format. */
  strftime(format: string): Expr;
  /** The wall-clock time in `zone` (an IANA name, `UTC` or `+05:30`; any expression) of a UTC instant. */
  toZone(zone: ExprLike): Expr;
  /** The UTC instant of a wall-clock time in `zone`. A time that occurs twice is the earliest unless `ambiguous` says. */
  fromZone(zone: ExprLike, options?: { ambiguous?: 'earliest' | 'latest' | 'raise' }): Expr;
  /** The zone's offset from UTC at a UTC instant: a `duration`. */
  zoneOffset(zone: ExprLike): Expr;
}

/** A column of the frame, by name. */
export const col = (name: string): Expr => new Expr({ k: 'col', name });

/** Field names for a struct type: letters, digits and `_`, not starting with a digit, each once. */
function checkFieldName(method: string, name: string): void {
  if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new DfError('SMALTDF_RANGE', `${method}: a field name is letters, digits and _, not ${JSON.stringify(name)}`);
}

function fieldsOf(method: string, fields: Readonly<Record<string, ExprLike>>): [string[], Node[]] {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || fields instanceof Expr) throw new DfError('SMALTDF_TYPE', `${method}: expected { name: expr, … }`);
  const names = Object.keys(fields);
  if (names.length === 0) throw new DfError('SMALTDF_TYPE', `${method}: expected one field or more`);
  for (const n of names) checkFieldName(method, n);
  return [names, names.map((n) => node(fields[n] as ExprLike))];
}

/** A struct of named values: `struct({ x: col('a'), y: 1 })`. */
export const struct = (fields: Readonly<Record<string, ExprLike>>): Expr => {
  const [names, args] = fieldsOf('struct', fields);
  return new Expr({ k: 'struct', names, args });
};

/**
 * One list of the values, in order: a list's elements are each added, a single value is added as one element. The
 * lists and values must be of one element type; a null list gives null.
 */
export const concatList = (...values: ExprLike[]): Expr => {
  if (values.length === 0) throw new DfError('SMALTDF_TYPE', 'concatList: expected one value or more');
  return new Expr({ k: 'op', method: 'concatList', args: values.map(node) });
};

/**
 * The element of the list a `list.eval`, `list.filter` or `list.agg` body runs over; `depth` reaches the lists around
 * it (0: the innermost). `element().position()` is its position.
 */
export const element = (depth = 0): Expr => {
  if (!Number.isSafeInteger(depth) || depth < 0) throw new DfError('SMALTDF_RANGE', `element: expected a depth of 0 or more, not ${depth}`);
  return new Expr({ k: 'element', part: 'value', depth });
};

/** The number of rows (of the frame, or of each group). */
export const len = (): Expr => new Expr({ k: 'agg', fn: 'len', arg: null });

/** A constant. A number that is an integer is `int`, any other number `real`; a JS `Date` is a `datetime`. */
export const lit = (value: number | bigint | string | boolean | Uint8Array | Date | null): Expr => new Expr({ k: 'lit', value });

// ------------------------------------------------------------------ resolving

const typeError = (scope: Scope, method: string, message: string): DfError => new DfError('SMALTDF_TYPE', `${scope.step}: ${method}: ${message}`);

function literal(value: Node & { k: 'lit' }): { plan: PlanExpr; type: DfType } {
  const v = value.value;
  if (v === null) return { plan: p.lit(null), type: 'null' };
  if (typeof v === 'boolean') return { plan: p.lit(v ? 1 : 0, 'int'), type: 'bool' };
  if (typeof v === 'bigint') return { plan: p.lit(v, 'int'), type: 'int' };
  if (typeof v === 'number') return { plan: p.lit(v, Number.isInteger(v) ? 'int' : 'real'), type: Number.isInteger(v) ? 'int' : 'real' };
  if (typeof v === 'string') return { plan: p.lit(v, 'text'), type: 'text' };
  if (v instanceof Date) {
    const ms = v.getTime();
    if (Number.isNaN(ms)) throw new DfError('SMALTDF_RANGE', 'lit: an invalid Date');
    return { plan: p.lit(ms * 1000, 'datetime'), type: 'datetime' };
  }
  return { plan: p.lit(v, 'blob'), type: 'blob' };
}

/** The result of arithmetic: int for two ints, real for any real, else known only when it runs. */
const arith = (a: DfType, b: DfType): DfType => (a === 'real' || b === 'real' ? 'real' : a === 'int' && b === 'int' ? 'int' : 'num');

/**
 * The type of `a m b` (add, sub, mul) where a date or time is involved, as the engine gives it (smaltdb ADR 0019), or
 * undefined where it isn't defined.
 */
function temporalArith(m: string, a: DfType, b: DfType): DfType | undefined {
  const either = (x: DfType, y: DfType): boolean => (a === x && b === y) || (a === y && b === x);
  if (m === 'sub') {
    if (a === b && (a === 'datetime' || a === 'date' || a === 'time' || a === 'duration')) return 'duration';
    if (a === 'datetime' && b === 'duration') return 'datetime';
  }
  if (m === 'add') {
    if (either('datetime', 'duration')) return 'datetime';
    if (a === 'duration' && b === 'duration') return 'duration';
  }
  if (m === 'mul' && either('duration', 'int')) return 'duration';
  return undefined;
}

/** Two types a comparison may compare: numbers with numbers, text with text, and so on. */
function comparable(a: DfType, b: DfType): boolean {
  if (a === 'null' || b === 'null' || a === 'any' || b === 'any') return true;
  if (isNumeric(a) && isNumeric(b)) return true;
  return a === b;
}

/** Text compared with a date or datetime is read as one (strictly: text that isn't one is an error). */
const TEXT_AS: Readonly<Record<string, string>> = { date: 'cast_date', datetime: 'cast_datetime' };

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

const CASTS: Readonly<Record<CastType, string>> = { int: 'cast_integer_strict', real: 'cast_real_strict', text: 'cast_text', blob: 'cast_blob', date: 'cast_date', datetime: 'cast_datetime' };

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
      // Dates and times convert with the engine's strict casts, which are calls (a cast node names SQL's conversions).
      const plan = n.to === 'date' || n.to === 'datetime' ? p.call(fn, [a.plan], n.to) : p.cast(fn, a.plan, n.to);
      return { plan: withOrigin(plan, { step: scope.step, method: 'cast' }), type: n.to, name: a.name };
    }
    case 'op':
      return EACH.has(n.method) ? resolveEach(n, scope) : resolveOp(n, scope);
    case 'struct': {
      const vals = n.args.map((x) => resolveNode(x, scope));
      return { plan: structOf(n.names, vals), type: structType(n.names, vals.map((v) => v.type)), name: 'struct' };
    }
    case 'element': {
      const frames = scope.elements ?? [];
      const f = frames[frames.length - 1 - n.depth];
      if (f === undefined) throw new DfError('SMALTDF_TYPE', frames.length === 0 ? `${scope.step}: element() is only inside list.eval, list.filter or list.agg` : `${scope.step}: element(${n.depth}): there are ${frames.length} lists around it`);
      if (!f.readable) throw new DfError('SMALTDF_TYPE', `${scope.step}: list.agg: element() goes inside an aggregate there (element().sum())`);
      if (n.part === 'position') return { plan: p.elementPosition(n.depth), type: 'int', name: 'position' };
      return { plan: p.element(planType(f.type), n.depth), type: f.type, name: 'element' };
    }
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
        // A list.eval, list.filter or list.agg body's aggregates are over the list's elements, not the frame's rows.
        return EACH.has(n.method) ? walk(n.args[0]!) : n.args.some(walk);
      case 'struct':
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
      case 'struct':
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

const AGG_FNS: Readonly<Record<AggFn, string>> = { implode: 'implode', sum: 'sum', mean: 'avg', min: 'min', max: 'max', count: 'count', len: 'count', first: 'first', last: 'last', median: 'median', std: 'stddev_samp', var: 'var_samp' };

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
      need(numeric || a.type === 'duration', 'takes numbers or durations');
      type = a.type === 'duration' ? 'duration' : a.type === 'real' ? 'real' : a.type === 'int' || a.type === 'bool' ? 'int' : 'num';
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
    case 'implode':
      type = `list<${a.type === 'null' ? 'any' : a.type}>` as DfType;
      break;
    default:
      type = a.type;
  }
  const call = p.agg(AGG_FNS[n.fn], [a.plan], planType(type));
  return { call: { ...call, origin: { step: input.step, method: n.fn } } as AggCall, type, name: a.name };
}

const EACH = new Set(['list.eval', 'list.filter', 'list.agg']);

/** `list.eval`, `list.filter` and `list.agg`: the body resolved once, run per element by the engine (`each`). */
function resolveEach(n: Node & { k: 'op' }, scope: Scope): Resolved {
  const m = n.method;
  const a = resolveNode(n.args[0]!, scope);
  const el = listElement(a.type);
  if (el === undefined && a.type !== 'null') throw typeError(scope, m, `takes a list, not ${a.type}`);
  const type = el ?? 'any';
  const outer = scope.elements ?? [];
  const origin: DfOrigin = { step: scope.step, method: m };
  // Aggregates belong in list.agg; windows aren't per element.
  const noAgg = (x: AggNode): Resolved => {
    throw typeError(scope, m, `${x.fn} is an aggregate: aggregate a list's elements with list.agg`);
  };
  const inner: Scope = { ...scope, elements: [...outer, { type, readable: true, method: m }], agg: noAgg, win: undefined };
  if (m === 'list.agg') {
    const aggs: EachAggCall<PlanExpr>[] = [];
    const bodyScope: Scope = {
      ...scope,
      elements: [...outer, { type, readable: false, method: m }],
      win: undefined,
      agg: (x) => {
        const r = resolveAggregate(x, inner);
        const { origin: _o, ...call } = r.call as AggCall & { origin?: unknown };
        aggs.push(call as EachAggCall<PlanExpr>);
        const ref = p.aggResult(aggs.length - 1, planType(r.type));
        // A sum of no elements is 0, as the sum of no rows.
        const plan = x.fn === 'sum' ? p.call('coalesce', [ref, p.lit(0, r.type === 'real' ? 'real' : 'int')], planType(r.type)) : ref;
        return { plan, type: r.type, name: r.name };
      },
    };
    const body = resolveNode(n.args[1]!, bodyScope);
    const plan: PlanExpr = { k: 'each', mode: 'agg', list: a.plan, aggs, body: body.plan, type: planType(body.type) } as PlanExpr;
    return { plan: withOrigin(plan, origin), type: body.type, name: a.name };
  }
  const body = resolveNode(n.args[1]!, inner);
  if (m === 'list.filter') {
    if (!isBool(body.type)) throw typeError(scope, m, `takes a bool predicate, not ${body.type}`);
    const plan: PlanExpr = { k: 'each', mode: 'filter', list: a.plan, body: body.plan, type: planType(a.type) } as PlanExpr;
    return { plan: withOrigin(plan, origin), type: a.type, name: a.name };
  }
  const t = `list<${body.type === 'null' ? 'any' : body.type}>` as DfType;
  const plan: PlanExpr = { k: 'each', mode: 'map', list: a.plan, body: body.plan, type: planType(t) } as PlanExpr;
  return { plan: withOrigin(plan, origin), type: t, name: a.name };
}

const structType = (names: readonly string[], types: readonly DfType[]): DfType => `struct<${names.map((n, i) => `${n} ${types[i] === 'null' ? 'any' : types[i]}`).join(', ')}>` as DfType;
const structOf = (names: readonly string[], vals: readonly Resolved[]): PlanExpr => p.call('struct_of', vals.map((v) => v.plan), planType(structType(names, vals.map((v) => v.type))));
/** `whole`, or null where `of` is null: a struct built from another's fields is null where that one is. */
const nullWhereNull = (of: PlanExpr, whole: PlanExpr, type: DfType): PlanExpr => p.caseWhen([{ when: p.isNull(of), then: p.lit(null) }], planType(type), whole);

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
    case 'mul': {
      if (isTemporal(a.type) || isTemporal(b!.type)) {
        const t = temporalArith(m, a.type, b!.type);
        need(t !== undefined, 'takes numbers, or dates and times as their arithmetic allows (datetime - datetime, datetime + duration, …)');
        return out(p.call(OPS[m]!, [a.plan, b!.plan], planType(t!)), t!);
      }
      need(isNumeric(a.type) && isNumeric(b!.type), 'takes numbers');
      return out(p.call(OPS[m]!, [a.plan, b!.plan], planType(arith(a.type, b!.type))), arith(a.type, b!.type));
    }
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
    case 'eqMissing': {
      // A text literal compared with a date or datetime is read as one.
      const asTemporal = (x: Resolved, other: Resolved): Resolved =>
        TEXT_AS[other.type] && x.type === 'text' && x.plan.k === 'lit' ? { ...x, plan: p.call(TEXT_AS[other.type]!, [x.plan], planType(other.type)), type: other.type } : x;
      const l = asTemporal(a, b!);
      const r = asTemporal(b!, a);
      need(comparable(l.type, r.type), 'compares values of one kind');
      return out(p.call(OPS[m]!, [l.plan, r.plan], 'int', 'binary'), 'bool');
    }
    case 'and':
    case 'or':
      need(isBool(a.type) && isBool(b!.type), 'takes bool values');
      return out(p.typed(m === 'and' ? p.and(a.plan, b!.plan) : p.or(a.plan, b!.plan), 'bool'), 'bool');
    case 'not':
      need(isBool(a.type), 'takes a bool value');
      return out(p.typed(p.not(a.plan), 'bool'), 'bool');
    case 'isNull':
      return out(p.typed(p.isNull(a.plan), 'bool'), 'bool');
    case 'isNotNull':
      return out(p.typed(p.isNotNull(a.plan), 'bool'), 'bool');
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
    case 'str.toDate':
    case 'str.toDatetime': {
      need(isText(a.type) && (b === undefined || b.type === 'text'), 'takes text and a format');
      const t: TemporalType = m === 'str.toDate' ? 'date' : 'datetime';
      const cast = t === 'date' ? 'cast_date' : 'cast_datetime';
      if (b === undefined) return out(p.call(cast, [a.plan], t), t);
      // Strict, as without a format: text the format doesn't read goes to the cast marked with the format, so the
      // cast fails and its error names both (text that is a date in the result format, but not in this format, too).
      const parsed = p.call(t === 'date' ? 'parse_date' : 'parse_datetime', [a.plan, b.plan], t);
      const marked = p.call('text_concat', [a.plan, p.call('text_concat', [p.lit(' (format ', 'text'), p.call('text_concat', [b.plan, p.lit(')', 'text')], 'text')], 'text')], 'text');
      return out(p.call(cast, [p.call('coalesce', [parsed, marked], 'any')], t), t);
    }
    case 'struct.field': {
      const fields = structFields(a.type);
      need(fields !== undefined, 'takes a struct');
      const name = b!.plan.k === 'lit' ? String(b!.plan.value) : '';
      const i = fields!.findIndex((f) => f.name === name);
      if (i < 0) throw new DfError('SMALTDF_SCHEMA', `${scope.step}: struct.field: ${a.type} has no field "${name}" (fields: ${fields!.map((f) => f.name).join(', ')})`);
      const t = fields![i]!.type;
      return { ...out(p.call('struct_field', [a.plan, p.lit(i, 'int')], planType(t)), t), name };
    }
    case 'struct.withFields':
    case 'struct.renameFields':
    case 'struct.drop':
    case 'struct.select':
    case 'struct.jsonEncode': {
      const fields = structFields(a.type);
      need(fields !== undefined, 'takes a struct');
      const read = (i: number): Resolved => ({ plan: p.call('struct_field', [a.plan, p.lit(i, 'int')], planType(fields![i]!.type)), type: fields![i]!.type, name: fields![i]!.name });
      const index = (name: string): number => {
        const i = fields!.findIndex((f) => f.name === name);
        if (i < 0) throw new DfError('SMALTDF_SCHEMA', `${scope.step}: ${m}: ${a.type} has no field "${name}" (fields: ${fields!.map((f) => f.name).join(', ')})`);
        return i;
      };
      const rest = args.slice(1).map((x) => String(x.plan.k === 'lit' ? x.plan.value : ''));
      if (m === 'struct.jsonEncode') return out(p.cast('cast_text', a.plan, 'text'), 'text');
      let names: string[];
      let vals: Resolved[];
      if (m === 'struct.withFields') {
        const add = n.args[1] as Node & { k: 'struct' };
        const extra = add.args.map((x) => resolveNode(x, scope));
        names = fields!.map((f) => f.name);
        vals = fields!.map((_f, i) => read(i));
        add.names.forEach((nm, j) => {
          const at = names.indexOf(nm);
          if (at >= 0) vals[at] = extra[j]!;
          else {
            names.push(nm);
            vals.push(extra[j]!);
          }
        });
      } else if (m === 'struct.renameFields') {
        if (rest.length !== fields!.length) throw typeError(scope, m, `takes ${fields!.length} names for ${a.type}, not ${rest.length}`);
        rest.forEach((nm) => checkFieldName(m, nm));
        if (new Set(rest).size !== rest.length) throw typeError(scope, m, 'takes each name once');
        names = rest;
        vals = fields!.map((_f, i) => read(i));
      } else if (m === 'struct.drop') {
        const gone = new Set(rest.map(index));
        names = fields!.filter((_f, i) => !gone.has(i)).map((f) => f.name);
        if (names.length === 0) throw typeError(scope, m, 'leaves no field');
        vals = fields!.flatMap((_f, i) => (gone.has(i) ? [] : [read(i)]));
      } else {
        if (rest.length === 0 || new Set(rest).size !== rest.length) throw typeError(scope, m, 'takes one field name or more, each once');
        names = rest;
        vals = rest.map((nm) => read(index(nm)));
      }
      const t = structType(names, vals.map((v) => v.type));
      return out(nullWhereNull(a.plan, structOf(names, vals), t), t);
    }
    case 'concatList': {
      // Each list's elements, each single value as one element: one list of one element type.
      const elems = args.map((x) => listElement(x.type) ?? x.type);
      const known = elems.filter((t) => t !== 'null' && t !== 'any');
      need(known.every((t) => comparable(t, known[0]!)), 'joins values and lists of one element type');
      const el: DfType = known.length === 0 ? 'any' : known.every((t) => t === known[0]) ? known[0]! : isNumeric(known[0]!) ? 'num' : 'any';
      const lt = `list<${el}>` as DfType;
      const asList = (x: Resolved): PlanExpr => (listElement(x.type) !== undefined ? x.plan : p.call('list_of', [x.plan], planType(lt)));
      const plan = args.slice(1).reduce((acc, x) => p.call('list_concat', [acc, asList(x)], planType(lt)), asList(a));
      return out(plan, lt);
    }
    default:
      if (m.startsWith('list.')) return resolveList(m.slice(5), args, scope, out, need);
      if (m.startsWith('dt.')) return resolveDt(m.slice(3), args, scope, out, need);
      throw new DfError('SMALTDF_TYPE', `${scope.step}: unknown method ${m}`);
  }
}

function resolveList(
  name: string,
  args: readonly Resolved[],
  scope: Scope,
  out: (plan: PlanExpr, type: DfType) => Resolved,
  need: (ok: boolean, what: string) => void,
): Resolved {
  const [a, b] = args as [Resolved, Resolved | undefined];
  const el = listElement(a.type);
  need(el !== undefined || a.type === 'null', 'takes a list');
  const elem = el ?? 'any';
  const call = (fn: string, type: DfType) => out(p.call(fn, args.map((x) => x.plan), planType(type)), type);
  const [, , c] = args as [Resolved, Resolved | undefined, Resolved | undefined];
  const ints = (xs: readonly (Resolved | undefined)[]): boolean => xs.every((x) => x === undefined || x.type === 'int' || x.type === 'null');
  const numbers = () => need(isNumeric(elem) || elem === 'bool', 'takes a list of numbers');
  const sameList = () => need(b!.type === a.type || b!.type === 'null' || a.type === 'null' || (listElement(b!.type) !== undefined && comparable(elem, listElement(b!.type)!)), 'takes two lists of one type');
  switch (name) {
    case 'len':
      return call('list_len', 'int');
    case 'get':
      need(ints([b]), 'takes a list and a whole-number index');
      return call('list_get', elem);
    case 'contains':
      need(comparable(elem, b!.type), 'looks for a value of the list\'s element type');
      return out(p.call('list_contains', args.map((x) => x.plan), 'int'), 'bool');
    case 'slice':
      need(args.slice(1).every((x) => x.type === 'int'), 'takes a whole-number offset and length');
      return call('list_slice', a.type);
    case 'concat':
      need(b!.type === a.type || b!.type === 'null', 'joins two lists of one type');
      return call('list_concat', a.type);
    case 'join':
      need(elem === 'text' || elem === 'any', 'joins a list of text');
      return call('list_join', 'text');
    case 'sort':
      return call('list_sort', a.type);
    case 'unique':
    case 'reverse':
      return call(`list_${name}`, a.type);
    case 'sum':
      numbers();
      return call('list_sum', elem === 'real' ? 'real' : elem === 'int' || elem === 'bool' ? 'int' : 'num');
    case 'mean':
    case 'median':
    case 'std':
    case 'var':
      numbers();
      return call(`list_${name}`, 'real');
    case 'min':
    case 'max':
      return call(`list_${name}`, elem);
    case 'nUnique':
      return call('list_n_unique', 'int');
    case 'argMin':
    case 'argMax':
      return call(name === 'argMin' ? 'list_arg_min' : 'list_arg_max', 'int');
    case 'countMatches':
      need(comparable(elem, b!.type), 'counts a value of the list\'s element type');
      return call('list_count_matches', 'int');
    case 'all':
    case 'any':
      need(isBool(elem), 'takes a list of bool values');
      return call(`list_${name}`, 'bool');
    case 'dropNulls':
      return call('list_drop_nulls', a.type);
    case 'shift':
      need(ints([b]), 'takes a whole number of places');
      return call('list_shift', a.type);
    case 'diff': {
      need(isNumeric(elem) || elem === 'bool' || elem === 'duration', 'takes a list of numbers or durations');
      const t = elem === 'bool' ? 'int' : elem === 'null' ? 'any' : elem;
      return call('list_diff', `list<${t}>` as DfType);
    }
    case 'gather': {
      const ix = listElement(b!.type);
      need(b!.type === 'null' || ix === 'int' || ix === 'any' || ix === 'null', 'takes a list of whole-number positions');
      return call('list_gather', a.type);
    }
    case 'gatherEvery':
      return call('list_gather_every', a.type);
    case 'toStruct': {
      const names = args.slice(1).map((x) => String(x.plan.k === 'lit' ? x.plan.value : ''));
      if (new Set(names).size !== names.length) throw typeError(scope, 'list.toStruct', 'takes each name once');
      const vals: Resolved[] = names.map((nm, i) => ({ plan: p.call('list_get', [a.plan, p.lit(i, 'int')], planType(elem)), type: elem, name: nm }));
      const t = structType(names, vals.map((v) => v.type));
      return out(nullWhereNull(a.plan, structOf(names, vals), t), t);
    }
    case 'sample':
      return call('list_sample', a.type);
    case 'item':
      return call('list_item', elem);
    case 'setUnion':
    case 'setIntersection':
    case 'setDifference':
    case 'setSymmetricDifference':
      sameList();
      return call(SET_FNS[name]!, a.type);
    default:
      throw new DfError('SMALTDF_TYPE', `${scope.step}: unknown method list.${name}`);
  }
}

const SET_FNS: Readonly<Record<string, string>> = { setUnion: 'list_union', setIntersection: 'list_intersect', setDifference: 'list_except', setSymmetricDifference: 'list_symmetric_except' };

const DT_PARTS: Readonly<Record<string, [string, readonly DfType[]]>> = {
  year: ['year', ['date', 'datetime']],
  month: ['month', ['date', 'datetime']],
  day: ['day', ['date', 'datetime']],
  weekday: ['weekday', ['date', 'datetime']],
  ordinalDay: ['day_of_year', ['date', 'datetime']],
  hour: ['hour', ['datetime', 'time']],
  minute: ['minute', ['datetime', 'time']],
  second: ['second', ['datetime', 'time']],
  microsecond: ['microsecond', ['datetime', 'time']],
};

/** Polars' `every` strings for truncation, as the engine's units. */
const EVERY: Readonly<Record<string, string>> = { '1y': 'year', '1q': 'quarter', '1mo': 'month', '1w': 'week', '1d': 'day', '1h': 'hour', '1m': 'minute', '1s': 'second', '1ms': 'millisecond', '1us': 'microsecond' };
const AMBIGUOUS: Readonly<Record<string, string>> = { earliest: 'earlier', latest: 'later', raise: 'reject' };

function resolveDt(
  name: string,
  args: readonly Resolved[],
  scope: Scope,
  out: (plan: PlanExpr, type: DfType) => Resolved,
  need: (ok: boolean, what: string) => void,
): Resolved {
  const [a, b, c] = args as [Resolved, Resolved | undefined, Resolved | undefined];
  const of = (...ts: DfType[]): boolean => ts.includes(a.type) || a.type === 'null';
  const text = (x: Resolved | undefined): boolean => x !== undefined && (x.type === 'text' || x.type === 'null' || x.type === 'any');
  const list = (ts: readonly DfType[]): string => ts.join(' or ');
  const part = DT_PARTS[name];
  if (part) {
    need(of(...part[1]), `takes a ${list(part[1])}`);
    return out(p.call(part[0], [a.plan], 'int'), 'int');
  }
  switch (name) {
    case 'date':
      need(of('datetime'), 'takes a datetime');
      return out(p.call('cast_date', [a.plan], 'date'), 'date');
    case 'truncate': {
      need(of('date', 'datetime', 'time'), 'takes a date, datetime or time');
      const every = b!.plan.k === 'lit' ? EVERY[String(b!.plan.value)] : undefined;
      if (every === undefined) throw new DfError('SMALTDF_RANGE', `${scope.step}: dt.truncate: every is one of ${Object.keys(EVERY).join(', ')}`);
      return out(p.call('trunc_temporal', [a.plan, p.lit(every, 'text')], planType(a.type)), a.type);
    }
    case 'offsetBy':
      need(of('date', 'datetime') && (text(b) || b!.type === 'duration'), 'takes a date or datetime, and text such as 1mo or a duration');
      return out(p.call('offset_by', [a.plan, b!.plan], planType(a.type)), a.type);
    case 'strftime':
      need(of('date', 'datetime', 'time') && text(b), 'takes a date, datetime or time, and a format');
      return out(p.call('format_temporal', [a.plan, b!.plan], 'text'), 'text');
    case 'toZone':
      need(of('datetime') && text(b), 'takes a datetime and a zone');
      return out(p.call('to_zone', [a.plan, b!.plan], 'datetime'), 'datetime');
    case 'fromZone': {
      need(of('datetime') && text(b), 'takes a datetime and a zone');
      const how = c === undefined ? [] : [p.lit(AMBIGUOUS[String(c.plan.k === 'lit' ? c.plan.value : '')] ?? 'compatible', 'text')];
      return out(p.call('from_zone', [a.plan, b!.plan, ...how], 'datetime'), 'datetime');
    }
    case 'zoneOffset':
      need(of('datetime') && text(b), 'takes a datetime and a zone');
      return out(p.call('zone_offset', [a.plan, b!.plan], 'duration'), 'duration');
    default:
      throw new DfError('SMALTDF_TYPE', `${scope.step}: unknown method dt.${name}`);
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
