import { describe, it, expect, beforeEach } from 'vitest';
import {
  byId, readCollection, removeById, upsertById, writeCollection,
} from '@/services/mock/storage';

interface Row { id: string; v: number }

describe('mock storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns the fallback when the key is empty', () => {
    expect(readCollection<Row>('rows', [{ id: 'a', v: 1 }])).toEqual([{ id: 'a', v: 1 }]);
  });

  it('round-trips a collection through namespaced localStorage', () => {
    writeCollection<Row>('rows', [{ id: 'b', v: 2 }]);
    expect(readCollection<Row>('rows', [])).toEqual([{ id: 'b', v: 2 }]);
    expect(localStorage.getItem('studhem.v1.rows')).not.toBeNull();
  });

  it('does not reuse the fallback once a value is written', () => {
    writeCollection<Row>('rows', []);
    expect(readCollection<Row>('rows', [{ id: 'x', v: 9 }])).toEqual([]);
  });
});

describe('typed CRUD over collections', () => {
  beforeEach(() => localStorage.clear());

  it('byId returns the matching row or undefined', () => {
    writeCollection<Row>('rows', [{ id: 'a', v: 1 }, { id: 'b', v: 2 }]);
    expect(byId<Row>('rows', 'a')).toEqual({ id: 'a', v: 1 });
    expect(byId<Row>('rows', 'missing')).toBeUndefined();
  });

  it('upsertById inserts a new row when id is absent', () => {
    upsertById<Row>('rows', { id: 'a', v: 1 });
    expect(readCollection<Row>('rows', [])).toEqual([{ id: 'a', v: 1 }]);
  });

  it('upsertById replaces an existing row by id', () => {
    upsertById<Row>('rows', { id: 'a', v: 1 });
    upsertById<Row>('rows', { id: 'a', v: 99 });
    expect(readCollection<Row>('rows', [])).toEqual([{ id: 'a', v: 99 }]);
  });

  it('removeById drops the matching row and is a no-op for missing ids', () => {
    upsertById<Row>('rows', { id: 'a', v: 1 });
    upsertById<Row>('rows', { id: 'b', v: 2 });
    removeById<Row>('rows', 'a');
    expect(readCollection<Row>('rows', [])).toEqual([{ id: 'b', v: 2 }]);
    removeById<Row>('rows', 'missing');
    expect(readCollection<Row>('rows', [])).toEqual([{ id: 'b', v: 2 }]);
  });
});
