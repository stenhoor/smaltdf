/**
 * smaltdf's errors name the method that caused them (DESIGN.md decision 10): errors found while a frame's plan is
 * built say so directly, and the engine's errors are given back with the method its plan node came from (`origin`).
 */

/** Where a plan node came from: the frame method, and the expression method within it. */
export interface DfOrigin {
  readonly step: string;
  readonly method?: string;
}

export class DfError extends Error {
  override readonly name = 'DfError';
  constructor(
    /** `SMALTDF_SCHEMA` (a name the frame doesn't have), `SMALTDF_TYPE` (a value of the wrong type for a method), `SMALTDF_RANGE`, or the engine's code. */
    readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

/** The engine's error `err`, worded with the smaltdf method its plan node came from. */
export function fromEngine(err: unknown): unknown {
  if (!(err instanceof Error)) return err;
  const o = (err as { origin?: unknown }).origin as DfOrigin | undefined;
  const code = (err as { code?: unknown }).code;
  if (!o || typeof o !== 'object' || typeof o.step !== 'string') return err;
  const where = o.method ? `${o.step}: ${o.method}` : o.step;
  return new DfError(typeof code === 'string' ? code : 'SMALT_ERROR', `${where}: ${err.message}`, { cause: err });
}
