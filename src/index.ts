/**
 * @smaltdb/df: a TypeScript language for smaltdb with dataframe interfaces (docs/REFERENCE.md).
 *
 * smaltdf builds plans for smaltdb's engine plan layer (`smaltdb/plan`) and runs them with `queryPlan`. Nothing in
 * smaltdf generates or runs SQL.
 */
export { type DfResult, type Db, Frame, GroupBy, type GroupByOptions, type SortOptions, type UniqueOptions, table } from './frame.js';
export { type AggFn, type CastType, Expr, type ExprLike, col, len, lit } from './expr.js';
export { DfError } from './errors.js';
export type { DfColumn, DfType } from './types.js';
