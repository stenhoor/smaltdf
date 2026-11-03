// Performance invariants: common pipelines must reach smaltdb's planner as one fused scan, so the engine (not a
// chain of subqueries) does the work. EXPLAIN QUERY PLAN shows one SCAN line for each of them.
import { describe, expect, test } from 'vitest';
import { col, len } from '../src/index.js';
import { setup } from './helpers.js';

describe('query plans', () => {
  const cases = {
    'filter + select + sort': (pl: ReturnType<typeof setup>['pl']) => pl.scanTable('orders').filter(col('qty').gt(1)).select('id', col('qty').mul(col('price')).alias('t')).sort('t'),
    'withColumns + groupBy + sort': (pl: ReturnType<typeof setup>['pl']) => pl.scanTable('orders').filter(col('qty').gt(0)).withColumns(col('qty').mul(col('price')).alias('revenue')).groupBy('region').agg(col('revenue').sum(), len()).sort('revenue', { descending: true }),
    'groupBy with statistics': (pl: ReturnType<typeof setup>['pl']) => pl.scanTable('orders').filter(col('qty').gt(0)).groupBy('region').agg(col('price').std(), col('price').median().alias('m'), col('price').quantile(0.9, 'linear').alias('p90')),
    'filter + filter + head': (pl: ReturnType<typeof setup>['pl']) => pl.scanTable('orders').filter(col('qty').gt(0)).filter(col('region').ne('east')).head(2),
  };
  for (const [name, build] of Object.entries(cases)) {
    test(name, async () => {
      const { db, pl } = setup();
      const lf = build(pl);
      const c = await lf.toSql();
      const plan = db.query(`EXPLAIN QUERY PLAN ${c.sql}`, c.params).rows.map((r) => String(r[3]));
      expect(plan.filter((l) => l.startsWith('SCAN')).length).toBe(1);
      expect(plan.join('\n')).toMatch(/fused scan/);
    });
  }
});
