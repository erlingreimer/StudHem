import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('contracts service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('returns the active contract for a property', async () => {
    const c = await api.contracts.byPropertyId('p-101');
    expect(c?.residentId).toBe('u-res1');
  });

  it('returns undefined when no contract exists', async () => {
    expect(await api.contracts.byPropertyId('p-103')).toBeUndefined();
  });
});
