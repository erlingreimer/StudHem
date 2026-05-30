import { describe, it, expect, beforeEach } from 'vitest';
import { readCollection, writeCollection } from '@/services/mock/storage';

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
