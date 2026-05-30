import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

// Fixtures: inv-1 paid 2026-03-31; inv-2 unpaid due 2026-04-30 (past);
// inv-3 + inv-4 unpaid due 2026-06-30. Today is anywhere from 2026-05-01
// onward for these tests to hold, which is the case during M5+ development.
describe('economy service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('list returns every seeded invoice', async () => {
    const rows = await api.economy.list();
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('derives overdue when an unpaid invoice is past its dueDate', async () => {
    const inv = (await api.economy.list()).find((r) => r.id === 'inv-2');
    expect(inv?.status).toBe('overdue');
  });

  it('byResident returns only invoices for that resident\'s contracts', async () => {
    const rows = await api.economy.byResident('u-res1');
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.every((r) => r.contractId === 'c-1')).toBe(true);
  });

  it('markPaid transitions to paid and sets paidAt', async () => {
    const before = (await api.economy.list()).find((r) => r.id === 'inv-3')!;
    expect(before.status).toBe('unpaid');

    const updated = await api.economy.markPaid('inv-3');
    expect(updated.status).toBe('paid');
    expect(updated.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const after = (await api.economy.list()).find((r) => r.id === 'inv-3')!;
    expect(after.status).toBe('paid');
  });

  it('sendReminder resolves without mutating state', async () => {
    const before = JSON.stringify(await api.economy.list());
    await api.economy.sendReminder('inv-2');
    const after = JSON.stringify(await api.economy.list());
    expect(after).toBe(before);
  });
});
