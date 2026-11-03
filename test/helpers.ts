import { Database } from 'smaltdb/engine';
import { smaltdf } from '../src/index.js';

/** An in-memory engine with an `orders` table, and smaltdf bound to it. */
export function setup() {
  const db = Database.openMemory();
  db.exec('CREATE TABLE orders(id INTEGER PRIMARY KEY, region TEXT, product TEXT, qty INTEGER, price REAL)');
  db.exec(`INSERT INTO orders VALUES
    (1, 'north', 'apple', 3, 1.5), (2, 'south', 'pear', 1, 2.0), (3, 'north', 'pear', NULL, 2.0),
    (4, 'east', 'plum', 5, 0.5), (5, 'south', 'apple', 2, 1.5), (6, 'north', 'plum', 4, 0.75)`);
  return { db, pl: smaltdf(db) };
}

/** Rows sorted by their JSON form, for results whose order is not defined. */
export const sorted = <T>(rows: T[]): T[] => [...rows].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
