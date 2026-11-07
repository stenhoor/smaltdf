<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/logos/smaltdf/lockup-on-dark.svg">
    <img alt="smaltdf" src="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/logos/smaltdf/lockup.svg" width="320">
  </picture>
</h1>

**Small. Alternative. Frames.**

Dataframes for [smaltdb](https://github.com/stenhoor/smaltdb). Small and fast.

smaltdf is a TypeScript language for smaltdb with dataframe interfaces: frames, expressions and method chains that
run in the smaltdb engine, on its row and columnar tables. It builds plans for the engine's shared plan layer, the
same layer every smaltdb language uses, so it gets the engine's optimizer, fused scans and spilling.

> **Status: design.** The engine's plan layer is in smaltdb, and smaltdf is next. The language is drafted in
> [docs/REFERENCE.md](docs/REFERENCE.md), the decisions and order of work in [docs/DESIGN.md](docs/DESIGN.md).

smaltdf is a language, not a user interface: [smaltui](https://github.com/stenhoor/smaltui) (and, later, smaltnb) are
the ways to use it interactively.

## Development

Requires Node 20+.

```sh
npm ci && npm run deps   # deps: the pinned smaltdb build from packed.json
npm run check            # type-check and test
```

See [CLAUDE.md](CLAUDE.md). MIT licence.
