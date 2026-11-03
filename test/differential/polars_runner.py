"""Runs differential test cases in Python Polars and prints the results as JSON.

Input (stdin): a JSON list of cases, each {"name", "data": {"columns": {...}, "schema": {...}}, "frames": {...}, "ops": [...]}.
Output (stdout): {name: {"columns": [...], "rows": [[...]]}} or {name: {"error": "..."}}.

Expressions and operations use Polars' own (snake_case) names, so the same JSON drives smaltdf, whose interpreter
maps them to its camelCase names (test/differential/interpret.ts).
"""
import json
import math
import sys

import polars as pl

DTYPES = {"Int64": pl.Int64, "Float64": pl.Float64, "String": pl.String, "Boolean": pl.Boolean}


def frame(spec):
    schema = {k: DTYPES[v] for k, v in spec["schema"].items()}
    return pl.DataFrame(spec["columns"], schema=schema)


def is_expr(a):
    return isinstance(a, dict) and any(k in a for k in ("col", "lit", "call", "fn", "when"))


def arg(a):
    if isinstance(a, dict) and "dtype" in a:
        return DTYPES[a["dtype"]]
    if is_expr(a):
        return expr(a)
    if isinstance(a, list):
        return [arg(x) for x in a]
    return a


def expr(e):
    if "col" in e:
        return pl.col(e["col"])
    if "lit" in e:
        return pl.lit(e["lit"])
    if "when" in e:
        chain = None
        for cond, then in e["when"]:
            chain = (pl.when(expr(cond)) if chain is None else chain.when(expr(cond))).then(expr(then))
        return chain.otherwise(expr(e["otherwise"])) if e.get("otherwise") is not None else chain
    if "fn" in e:
        return getattr(pl, e["fn"])(*[arg(a) for a in e.get("args", [])], **e.get("kwargs", {}))
    target = expr(e["on"])
    for part in e["call"].split("."):
        target = getattr(target, part)
    return target(*[arg(a) for a in e.get("args", [])], **e.get("kwargs", {}))


def run(case):
    lf = frame(case["data"]).lazy()
    others = {k: frame(v).lazy() for k, v in case.get("frames", {}).items()}
    for op in case["ops"]:
        name = op["op"]
        if name == "group_by_agg":
            lf = lf.group_by(*[arg(k) for k in op["keys"]]).agg(*[arg(a) for a in op["aggs"]])
        elif name == "join":
            lf = lf.join(others[op["other"]], **op.get("kwargs", {}))
        else:
            lf = getattr(lf, name)(*[arg(a) for a in op.get("args", [])], **op.get("kwargs", {}))
    df = lf.collect()
    return {"columns": df.columns, "rows": [list(r) for r in df.rows()]}


def clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return str(v)
    return v


def main():
    cases = json.load(sys.stdin)
    out = {}
    for case in cases:
        try:
            res = run(case)
            res["rows"] = [[clean(v) for v in r] for r in res["rows"]]
            out[case["name"]] = res
        except Exception as exc:  # noqa: BLE001 - reported to the test as data
            out[case["name"]] = {"error": f"{type(exc).__name__}: {exc}"}
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
