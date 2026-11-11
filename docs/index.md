---
layout: home

hero:
  name: 'sm<span class="alt">alt</span><span class="suffix language">df</span>'
  text: 'Small. Alternative.<br>Frames.'
  tagline: Dataframes for smaltdb. Small and fast.
  image:
    light: /axes-mark.svg
    dark: /axes-mark-on-dark.svg
    alt: smaltdf
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Quick start
      link: /guide/quick-start
    - theme: alt
      text: Reference
      link: /reference/

features:
  - title: Frames and expressions
    details: Method chains over tables and views, with typed columns. A frame describes rows; nothing runs until collect.
    link: /guide/frames
    linkText: Frames and expressions
  - title: Plans, not text
    details: Every frame builds a plan for smaltdb's engine plan layer, so it gets the engine's optimizer, fused scans and spilling. There is no query text in between.
    link: /reference/frames/plan
    linkText: How a frame runs
  - title: Group, join, window
    details: groupBy and agg, joins of every kind with asof, concat, and windows that never move rows.
    link: /guide/aggregation
    linkText: Aggregation
  - title: Reshape and write
    details: pivot, unpivot and sample; frames from JavaScript arrays and typed arrays; insertInto, createTable, update and deleteFrom.
    link: /guide/reshaping
    linkText: Reshaping
  - title: Views by name
    details: A frame stored as a view, plain or materialized, read by name like a table and bound by smaltdf where a plan reads it.
    link: /guide/views
    linkText: Views
  - title: Strict by default
    details: Integer overflow and values that don't convert are errors, and every error names the method it came from.
    link: /guide/errors
    linkText: Errors
---
