import { describe, it, expect, beforeEach } from 'vitest';
import { seedDatabase } from '@/services/mock/seed';
import { readCollection } from '@/services/mock/storage';
import type { User } from '@/types';

describe('seedDatabase', () => {
  beforeEach(() => localStorage.clear());

  it('seeds the demo users on first run', () => {
    seedDatabase();
    const users = readCollection<User>('users', []);
    expect(users.map((u) => u.username).sort()).toEqual(['admin', 'resident', 'staff']);
  });

  it('is idempotent and does not overwrite existing data', () => {
    seedDatabase();
    const users = readCollection<User>('users', []);
    users[0].name = 'EDITED';
    // simulate a prior write
    localStorage.setItem('studhem.v1.users', JSON.stringify(users));
    seedDatabase();
    const after = readCollection<User>('users', []);
    expect(after.find((u) => u.id === users[0].id)?.name).toBe('EDITED');
  });
});
