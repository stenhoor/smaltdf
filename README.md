<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/logos/smaltdf/lockup-on-dark.svg">
    <img alt="smaltdf" src="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/logos/smaltdf/lockup.svg" width="320">
  </picture>
</h1>

<a href="https://smaltworks.dev/stability"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/badges/work-in-progress-on-dark.svg"><img alt="Work in progress. Come build with us." src="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/badges/work-in-progress.svg" height="56"></picture></a>

**Small. Alternative. Frames.** Dataframes for [smaltdb](https://github.com/stenhoor/smaltdb). Small and fast.

[Documentation](https://stenhoor.github.io/smaltdf/) · [smaltworks.dev](https://smaltworks.dev)

smaltdf is a TypeScript language for smaltdb with dataframe interfaces: frames, expressions and method chains that
run in the smaltdb engine, on its row and columnar tables. It builds plans for the engine's shared plan layer, the
same layer every smaltdb language uses, so it gets the engine's optimizer, fused scans and spilling.

> **Status: in development, not published.** Steps 2–9 of [docs/DESIGN.md](docs/DESIGN.md) are in: frames,
> aggregation, joins, windows, reshaping, data from JavaScript, writing, views and the Polars comparison tests. Docs:
> [stenhoor.github.io/smaltdf](https://stenhoor.github.io/smaltdf/); the language is in
> [docs/REFERENCE.md](docs/REFERENCE.md).

smaltdf is a language, not a user interface: [smaltui](https://github.com/stenhoor/smaltui) (and, later, smaltnb) are
the ways to use it interactively.

## Development

Requires Node 20+.

```sh
npm ci && npm run deps   # deps: the pinned smaltdb build from packed.json
npm run check            # type-check and test
```

See [CLAUDE.md](CLAUDE.md).

<a href="https://smaltworks.dev"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/badges/a-smaltworks-project-on-dark.svg"><img alt="A smaltworks project" src="https://raw.githubusercontent.com/stenhoor/smalt-brand/main/badges/a-smaltworks-project.svg" height="28"></picture></a>

MIT License.
