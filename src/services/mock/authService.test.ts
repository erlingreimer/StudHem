import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('mock auth service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('logs in a valid user and never returns the password', async () => {
    const user = await api.auth.login('admin', 'admin123');
    expect(user.role).toBe('admin');
    expect((user as Record<string, unknown>).password).toBeUndefined();
  });

  it('rejects a wrong password', async () => {
    await expect(api.auth.login('admin', 'nope')).rejects.toThrow();
  });

  it('rejects an unknown username', async () => {
    await expect(api.auth.login('ghost', 'x')).rejects.toThrow();
  });
});
