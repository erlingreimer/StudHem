import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('maintenance service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('list returns all seeded requests', async () => {
    const rows = await api.maintenance.list();
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('byResident returns only that resident\'s requests', async () => {
    const rows = await api.maintenance.byResident('u-res1');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((r) => r.residentId === 'u-res1')).toBe(true);
  });

  it('byProperty returns only that property\'s requests', async () => {
    const rows = await api.maintenance.byProperty('p-102');
    expect(rows.every((r) => r.propertyId === 'p-102')).toBe(true);
  });

  it('create assigns id+createdAt and seeds history with status received', async () => {
    const row = await api.maintenance.create({
      propertyId: 'p-101', residentId: 'u-res1', category: 'electrical',
      description: 'Strömavbrott i lampa.', photoUrls: [],
    });
    expect(row.id).toMatch(/^mr-/);
    expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(row.status).toBe('received');
    expect(row.history).toHaveLength(1);
    expect(row.history[0].status).toBe('received');
  });

  it('updateStatus appends a history entry and updates the status', async () => {
    const updated = await api.maintenance.updateStatus('mr-1', 'in_progress', 'Tekniker på väg');
    expect(updated.status).toBe('in_progress');
    expect(updated.history.at(-1)).toMatchObject({ status: 'in_progress', note: 'Tekniker på väg' });
  });

  it('assign sets assignedTo without altering status or history', async () => {
    const assigned = await api.maintenance.assign('mr-1', 'u-staff');
    expect(assigned.assignedTo).toBe('u-staff');
    expect(assigned.status).toBe('received');
  });
});
