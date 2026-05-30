import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('users service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('list returns all seeded users (without passwords)', async () => {
    const rows = await api.users.list();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect((rows[0] as Record<string, unknown>).password).toBeUndefined();
  });

  it('get returns a single user by id', async () => {
    const u = await api.users.get('u-res1');
    expect(u?.username).toBe('resident');
  });

  it('invite creates a pending resident and a draft contract assignment', async () => {
    const result = await api.users.invite({
      name: 'Nora New', email: 'nora@student.se', propertyId: 'p-103',
    });
    expect(result.user.status).toBe('pending');
    expect(result.user.role).toBe('resident');
    expect(result.tempPassword).toMatch(/.{8,}/);
    const property = await api.properties.get('p-103');
    expect(property?.status).toBe('occupied');
    expect(property?.residentId).toBe(result.user.id);
    const contract = await api.contracts.byPropertyId('p-103');
    expect(contract?.residentId).toBe(result.user.id);
  });

  it('setPassword updates the user and flips status to active', async () => {
    await api.users.setPassword('u-pending', 'newpass1');
    const user = await api.users.get('u-pending');
    expect(user?.status).toBe('active');
    const logged = await api.auth.login('pending', 'newpass1');
    expect(logged.id).toBe('u-pending');
  });
});
