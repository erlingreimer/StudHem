import { STORAGE_PREFIX } from '@/config/constants';

const key = (name: string) => `${STORAGE_PREFIX}${name}`;

/** Reads a JSON collection; returns `fallback` only when the key is absent. */
export function readCollection<T>(name: string, fallback: T[]): T[] {
  const raw = localStorage.getItem(key(name));
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

export function writeCollection<T>(name: string, rows: T[]): void {
  localStorage.setItem(key(name), JSON.stringify(rows));
}

export function hasKey(name: string): boolean {
  return localStorage.getItem(key(name)) !== null;
}

interface HasId { id: string }

export function byId<T extends HasId>(name: string, id: string): T | undefined {
  return readCollection<T>(name, []).find((row) => row.id === id);
}

export function upsertById<T extends HasId>(name: string, row: T): void {
  const rows = readCollection<T>(name, []);
  const i = rows.findIndex((r) => r.id === row.id);
  if (i >= 0) rows[i] = row;
  else rows.push(row);
  writeCollection<T>(name, rows);
}

export function removeById<T extends HasId>(name: string, id: string): void {
  const rows = readCollection<T>(name, []);
  const next = rows.filter((r) => r.id !== id);
  if (next.length !== rows.length) writeCollection<T>(name, next);
}
