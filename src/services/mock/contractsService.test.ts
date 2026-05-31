import { describe, it, expect, beforeEach } from 'vitest';
import dayjs from 'dayjs';
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

  it('byResidentId returns the active contract for that resident', async () => {
    const c = await api.contracts.byResidentId('u-res1');
    expect(c?.id).toBe('c-1');
  });

  it('giveNotice with a sufficient window updates the contract', async () => {
    const moveOut = dayjs().add(2, 'month').add(1, 'day').format('YYYY-MM-DD');
    const updated = await api.contracts.giveNotice('c-1', moveOut);
    expect(updated.status).toBe('notice_given');
    expect(updated.endDate).toBe(moveOut);
    expect(updated.noticeGivenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('giveNotice rejects a date inside the 2-month window', async () => {
    const tooSoon = dayjs().add(1, 'month').format('YYYY-MM-DD');
    await expect(api.contracts.giveNotice('c-1', tooSoon))
      .rejects.toThrow('notice_too_short');
  });

  it('markMovedOut transitions to ended, vacates the property, and clears residentId', async () => {
    const moveOut = dayjs().add(2, 'month').add(1, 'day').format('YYYY-MM-DD');
    await api.contracts.giveNotice('c-1', moveOut);

    const result = await api.contracts.markMovedOut('c-1');
    expect(result.contract.status).toBe('ended');
    expect(result.property.status).toBe('vacant');
    expect(result.property.residentId).toBeUndefined();

    const property = await api.properties.get('p-101');
    expect(property?.status).toBe('vacant');
    expect(property?.residentId).toBeUndefined();
  });
});
