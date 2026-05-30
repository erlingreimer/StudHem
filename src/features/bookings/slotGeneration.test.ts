import { describe, it, expect } from 'vitest';
import { generateSlots, SLOT_TEMPLATES } from '@/features/bookings/slotGeneration';

describe('slotGeneration', () => {
  it('laundry has 5 three-hour slots starting at 06:00 UTC', () => {
    const slots = generateSlots('laundry', '2026-06-10');
    expect(slots).toHaveLength(5);
    expect(slots[0].start).toBe('2026-06-10T06:00:00.000Z');
    expect(slots[0].end).toBe('2026-06-10T09:00:00.000Z');
  });

  it('sauna has 3 three-hour slots starting at 14:00 UTC', () => {
    const slots = generateSlots('sauna', '2026-06-10');
    expect(slots).toHaveLength(3);
    expect(slots[0].start).toBe('2026-06-10T14:00:00.000Z');
  });

  it('common_room is a single all-day slot', () => {
    const slots = generateSlots('common_room', '2026-06-10');
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toBe('2026-06-10T09:00:00.000Z');
    expect(slots[0].end).toBe('2026-06-10T22:00:00.000Z');
  });

  it('guest_room runs overnight to the next day at 14:00', () => {
    const slots = generateSlots('guest_room', '2026-06-10');
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toBe('2026-06-10T14:00:00.000Z');
    expect(slots[0].end).toBe('2026-06-11T14:00:00.000Z');
  });

  it('SLOT_TEMPLATES covers every FacilityType', () => {
    expect(Object.keys(SLOT_TEMPLATES).sort())
      .toEqual(['common_room', 'guest_room', 'laundry', 'sauna']);
  });
});
