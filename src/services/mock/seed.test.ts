import { describe, it, expect, beforeEach } from 'vitest';
import { seedDatabase } from '@/services/mock/seed';
import { readCollection } from '@/services/mock/storage';
import type { Building, Contract, Facility, Property, User } from '@/types';

describe('seedDatabase', () => {
  beforeEach(() => localStorage.clear());

  it('seeds users (incl. one pending resident)', () => {
    seedDatabase();
    const users = readCollection<User>('users', []);
    expect(users.map((u) => u.username).sort()).toEqual(
      ['admin', 'pending', 'resident', 'resident2', 'staff'],
    );
    expect(users.find((u) => u.username === 'pending')?.status).toBe('pending');
  });

  it('seeds buildings, properties, contracts and facilities', () => {
    seedDatabase();
    expect(readCollection<Building>('buildings', [])).toHaveLength(2);
    const properties = readCollection<Property>('properties', []);
    expect(properties.length).toBeGreaterThanOrEqual(8);
    expect(properties.every((p) => p.buildingId)).toBe(true);
    expect(readCollection<Contract>('contracts', []).length).toBeGreaterThan(0);
    expect(readCollection<Facility>('facilities', []).length).toBeGreaterThanOrEqual(8);
  });

  it('is idempotent across all collections', () => {
    seedDatabase();
    const first = readCollection<Property>('properties', []);
    first[0].name = 'EDITED';
    localStorage.setItem('studhem.v1.properties', JSON.stringify(first));
    seedDatabase();
    const after = readCollection<Property>('properties', []);
    expect(after.find((p) => p.id === first[0].id)?.name).toBe('EDITED');
  });
});
