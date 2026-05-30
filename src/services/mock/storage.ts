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
