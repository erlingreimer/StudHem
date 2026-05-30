import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('bookings service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('list returns all seeded bookings', async () => {
    const rows = await api.bookings.list();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('byResident returns only that resident\'s bookings', async () => {
    const rows = await api.bookings.byResident('u-res1');
    expect(rows.every((r) => r.bookedById === 'u-res1')).toBe(true);
  });

  it('byFacility returns only that facility\'s bookings', async () => {
    const rows = await api.bookings.byFacility('f-n-laundry');
    expect(rows.every((r) => r.facilityId === 'f-n-laundry')).toBe(true);
  });

  it('create succeeds for a non-overlapping slot', async () => {
    const row = await api.bookings.create({
      facilityType: 'laundry',
      facilityId: 'f-n-laundry',
      bookedById: 'u-res2',
      start: '2026-06-05T15:00:00Z',
      end: '2026-06-05T18:00:00Z',
    });
    expect(row.id).toMatch(/^bk-/);
  });

  it('create rejects an overlapping slot', async () => {
    await expect(api.bookings.create({
      facilityType: 'laundry',
      facilityId: 'f-n-laundry',
      bookedById: 'u-res2',
      start: '2026-06-05T10:00:00Z',
      end: '2026-06-05T13:00:00Z',
    })).rejects.toThrow('booking_overlap');
  });

  it('create rejects when the resident is at the per-facility-type limit', async () => {
    await api.bookings.create({
      facilityType: 'sauna', facilityId: 'f-n-sauna',
      bookedById: 'u-res2',
      start: '2026-06-07T17:00:00Z',
      end: '2026-06-07T20:00:00Z',
    });
    await expect(api.bookings.create({
      facilityType: 'sauna', facilityId: 'f-n-sauna',
      bookedById: 'u-res2',
      start: '2026-06-08T17:00:00Z',
      end: '2026-06-08T20:00:00Z',
    })).rejects.toThrow('booking_limit');
  });

  it('cancel removes the booking', async () => {
    await api.bookings.cancel('bk-1');
    expect((await api.bookings.list()).find((r) => r.id === 'bk-1')).toBeUndefined();
  });
});
