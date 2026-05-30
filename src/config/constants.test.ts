import { describe, it, expect } from 'vitest';
import {
  NOTICE_PERIOD_MONTHS, MAX_FUTURE_BOOKINGS_PER_FACILITY,
  STORAGE_PREFIX, MOCK_LATENCY_MS,
} from '@/config/constants';

describe('constants', () => {
  it('exposes the configurable business rules', () => {
    expect(NOTICE_PERIOD_MONTHS).toBe(2);
    expect(MAX_FUTURE_BOOKINGS_PER_FACILITY).toBe(2);
    expect(STORAGE_PREFIX).toBe('studhem.v1.');
    expect(MOCK_LATENCY_MS).toBeGreaterThanOrEqual(0);
  });
});
