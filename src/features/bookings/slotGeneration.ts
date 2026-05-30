import type { FacilityType } from '@/types';

export interface Slot {
  start: string;
  end: string;
}

interface SlotTemplate {
  hours: Array<[number, number]>;
  overnight?: boolean;
}

export const SLOT_TEMPLATES: Record<FacilityType, SlotTemplate> = {
  laundry: { hours: [[6, 9], [9, 12], [12, 15], [15, 18], [18, 21]] },
  sauna: { hours: [[14, 17], [17, 20], [20, 23]] },
  common_room: { hours: [[9, 22]] },
  guest_room: { hours: [[14, 14]], overnight: true },
};

function iso(date: string, hour: number, plusDays = 0): string {
  const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + plusDays, hour, 0, 0, 0));
  return dt.toISOString();
}

export function generateSlots(type: FacilityType, date: string): Slot[] {
  const template = SLOT_TEMPLATES[type];
  return template.hours.map(([s, e]) => ({
    start: iso(date, s),
    end: iso(date, e, template.overnight ? 1 : 0),
  }));
}
