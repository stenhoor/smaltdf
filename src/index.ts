/**
 * @smaltworks/smaltdf: a TypeScript language for smaltdb with dataframe interfaces (docs/reference/).
 *
 * smaltdf builds plans for smaltdb's engine plan layer (`smaltdb/plan`) and runs them with `queryPlan`. Nothing in
 * smaltdf generates or runs SQL.
 */
export { type AsofOptions, type DfResult, type Db, Frame, GroupBy, type GroupByOptions, type JoinHow, type JoinOptions, type SortOptions, type UniqueOptions, type FrameData, type PivotOptions, type SampleOptions, type UnpivotOptions, type ExplodeOptions, concat, frame, table } from './frame.js';
export { type AggFn, type CastType, Expr, type ExprLike, type ListMethods, type DtMethods, type RankMethod, type WinFn, col, concatList, element, len, lit, struct, type StructMethods } from './expr.js';
export { DfError } from './errors.js';
export { type ViewOptions, dfLanguage, refreshView } from './view.js';
export { type CreateTableOptions, type InsertOptions, Write, type WriteResult, deleteFrom, update } from './write.js';
export type { DfColumn, DfType } from './types.js';
