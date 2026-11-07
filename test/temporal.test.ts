/**
 * Dates and times (smaltdb ADR 0019 step 6): `date`, `datetime`, `time` and `duration` columns, from JavaScript Dates
 * and from tables; their arithmetic, comparisons (also with text), the `dt` methods, parsing, time zones and writes.
 * Collect gives a datetime as a JS Date and the others as text. In process and through the worker.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { col, frame, lit, table } from '../src/index.js';
import { KINDS, makeDb } from './helpers/db.js';

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});

const at = (iso: string) => new Date(iso + 'Z');

describe.each(KINDS)('%s', (kind) => {
  const open = async () => {
    const d = await makeDb(kind, []);
    closers.push(d.close);
    return d.db;
  };
  const events = () =>
    frame({
      id: [1, 2, 3],
      ts: [at('2026-11-07T13:04:05.678'), at('2024-02-29T00:00:00'), null],
    });

  it('JS Dates are datetimes, collected as Dates', async () => {
    const db = await open();
    const r = await events().collect(db);
    expect(r.types).toEqual(['int', 'datetime']);
    expect(r.rows).toEqual([[1, at('2026-11-07T13:04:05.678')], [2, at('2024-02-29T00:00:00')], [3, null]]);
    expect((await frame({ a: [1] }).select(lit(at('1969-12-31T23:59:59.999')).alias('t')).collect(db)).rows).toEqual([[at('1969-12-31T23:59:59.999')]]);
  });

  it('the dt parts, date, truncate, offsetBy and strftime', async () => {
    const db = await open();
    const parts = await events()
      .filter(col('id').eq(1))
      .select(
        col('ts').dt.year().alias('y'),
        col('ts').dt.month().alias('mo'),
        col('ts').dt.day().alias('d'),
        col('ts').dt.weekday().alias('wd'),
        col('ts').dt.ordinalDay().alias('od'),
        col('ts').dt.hour().alias('h'),
        col('ts').dt.minute().alias('mi'),
        col('ts').dt.second().alias('s'),
        col('ts').dt.microsecond().alias('us'),
      )
      .collect(db);
    expect(parts.rows).toEqual([[2026, 11, 7, 6, 311, 13, 4, 5, 678000]]);
    const r = await events()
      .filter(col('id').eq(1))
      .select(
        col('ts').dt.date().alias('day'),
        col('ts').dt.truncate('1mo').alias('month'),
        col('ts').dt.truncate('1w').alias('week'),
        col('ts').dt.offsetBy('1mo-').alias('bad'),
      )
      .collect(db)
      .catch((e: Error) => e);
    expect(String(r)).toMatch(/is not an offset/);
    const ok = await events()
      .filter(col('id').eq(2))
      .select(col('ts').dt.date().alias('day'), col('ts').dt.truncate('1y').alias('year'), col('ts').dt.offsetBy('1y').alias('next'), col('ts').dt.strftime('%d/%m/%Y %H:%M').alias('text'))
      .collect(db);
    expect(ok.types).toEqual(['date', 'datetime', 'datetime', 'text']);
    expect(ok.rows).toEqual([['2024-02-29', at('2024-01-01T00:00:00'), at('2025-02-28T00:00:00'), '29/02/2024 00:00']]);
  });

  it('arithmetic: differences are durations, a datetime moves by a duration', async () => {
    const db = await open();
    const r = await events()
      .filter(col('id').eq(1))
      .select(
        col('ts').sub(lit(at('2026-11-07T00:00:00'))).alias('since'),
        col('ts').dt.date().sub(lit('2026-01-01').str.toDate()).alias('days'),
        col('ts').add(col('ts').sub(col('ts'))).alias('same'),
      )
      .collect(db);
    expect(r.types).toEqual(['duration', 'duration', 'datetime']);
    expect(r.rows).toEqual([['PT13H4M5.678S', 'P310D', at('2026-11-07T13:04:05.678')]]);
    await expect(events().select(col('ts').add(1)).collect(db)).rejects.toThrow(/add: takes numbers, or dates and times/);
    expect((await events().select(col('ts').sub(lit(at('2024-01-01T00:00:00'))).sum().alias('total')).collect(db)).rows).toEqual([['P1100DT13H4M5.678S']]);
  });

  it('comparisons: with datetimes, and with text that is one', async () => {
    const db = await open();
    const ids = async (pred: ReturnType<typeof col>) => (await events().filter(pred).select('id').collect(db)).rows.map((r) => r[0]);
    expect(await ids(col('ts').gt(lit(at('2025-01-01T00:00:00'))))).toEqual([1]);
    expect(await ids(col('ts').lt('2025-01-01 00:00:00'))).toEqual([2]);
    expect(await ids(col('ts').dt.date().eq('2024-02-29'))).toEqual([2]);
    await expect(ids(col('ts').gt('soon'))).rejects.toThrow(/'soon' is not a date and time/);
    await expect(ids(col('ts').gt(5))).rejects.toThrow(/compares values of one kind/);
  });

  it('parsing text: strict, with or without a format', async () => {
    const db = await open();
    const t = frame({ s: ['2026-11-07', '07/11/2026', null] });
    expect((await t.slice(0, 1).select(col('s').str.toDate()).collect(db)).rows).toEqual([['2026-11-07']]);
    expect((await t.slice(1, 1).select(col('s').str.toDate('%d/%m/%Y')).collect(db)).rows).toEqual([['2026-11-07']]);
    expect((await t.slice(2, 1).select(col('s').str.toDatetime('%d/%m/%Y')).collect(db)).rows).toEqual([[null]]);
    await expect(t.select(col('s').str.toDate()).collect(db)).rejects.toThrow(/'07\/11\/2026' is not a date/);
    await expect(t.select(col('s').str.toDate('%d/%m/%Y')).collect(db)).rejects.toThrow(/'2026-11-07 \(format %d\/%m\/%Y\)' is not a date/);
    expect((await t.slice(0, 1).select(col('s').cast('datetime')).collect(db)).rows).toEqual([[at('2026-11-07T00:00:00')]]);
  });

  it('time zones: a zone per row', async () => {
    const db = await open();
    const z = frame({ ts: [at('2026-07-01T12:00:00'), at('2026-07-01T12:00:00')], zone: ['Europe/Paris', 'Asia/Kolkata'] });
    const r = await z.select(col('ts').dt.toZone(col('zone')).alias('local'), col('ts').dt.zoneOffset(col('zone')).alias('offset')).collect(db);
    expect(r.rows).toEqual([[at('2026-07-01T14:00:00'), 'PT2H'], [at('2026-07-01T17:30:00'), 'PT5H30M']]);
    const back = await frame({ wall: [at('2026-10-25T02:30:00')] })
      .select(col('wall').dt.fromZone('Europe/Paris').alias('first'), col('wall').dt.fromZone('Europe/Paris', { ambiguous: 'latest' }).alias('second'))
      .collect(db);
    expect(back.rows).toEqual([[at('2026-10-25T00:30:00'), at('2026-10-25T01:30:00')]]);
  });

  it('a table keeps them: DATETIME, DATE and DURATION storage', async () => {
    const db = await open();
    await events()
      .withColumns(col('ts').dt.date().alias('day'), col('ts').sub(col('ts')).alias('zero'))
      .createTable(db, 'ev');
    const all = await table('ev').sort('id').collect(db);
    expect(all.types).toEqual(['int', 'datetime', 'date', 'duration']);
    expect(all.rows[0]).toEqual([1, at('2026-11-07T13:04:05.678'), '2026-11-07', 'PT0S']);
    await expect(frame({ id: [4], ts: ['2026-01-01'], day: [null], zero: [null] }).insertInto(db, 'ev')).rejects.toThrow(/ts is text, and ev.ts holds DATETIME/);
    expect(await frame({ id: [4], ts: [at('2027-01-01T00:00:00')], day: [null], zero: [null] }).insertInto(db, 'ev')).toEqual({ rows: 1 });
    expect((await table('ev').filter(col('ts').ge('2027-01-01 00:00:00')).select('id').collect(db)).rows).toEqual([[4]]);
  });
});
