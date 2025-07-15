// src/lib/store.ts
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export interface SavedDB {
  // one Set per userToken (stored as string[] so JSON is trivial)
  favorites: Record<string, string[]>;
}

/* ------------------------------------------------------------------ */
/* Init LowDB (sync, CJS‑friendly)                                     */
/* ------------------------------------------------------------------ */
const DATA_DIR = join(process.cwd(), '.data');
const DB_FILE  = join(DATA_DIR, 'favorites.json');

// ensure .data/ exists
mkdirSync(DATA_DIR, { recursive: true });

const adapter = new FileSync<SavedDB>(DB_FILE);
const db      = low(adapter);

// seed file on first run
db.defaults({ favorites: {} }).write();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export function toggleFavorite(
  userToken: string,
  objectID:  string,
  save:      boolean,
): number {
  // get current list for that user (or empty array)
  const current: string[] = (db.get(`favorites.${userToken}`) as any).value() ?? [];

  const set = new Set(current);
  save ? set.add(objectID) : set.delete(objectID);

  db.set(`favorites.${userToken}`, [...set]).write();
  return set.size;                 // so the route can return “total”
}

export function getFavorites(userToken: string): string[] {
  return (db.get(`favorites.${userToken}`) as any).value() ?? [];
}
