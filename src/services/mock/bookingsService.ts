import type { BookingsApi, CreateBookingInput } from '@/services/api';
import type { Booking } from '@/types';
import {
  MAX_FUTURE_BOOKINGS_PER_FACILITY, MOCK_LATENCY_MS,
} from '@/config/constants';
import { readCollection, removeById, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateId(): string {
  return `bk-${Math.random().toString(36).slice(2, 8)}`;
}

function overlaps(a: { start: string; end: string }, b: { start: string; end: string }) {
  return a.start < b.end && b.start < a.end;
}

function isFuture(row: Booking, now: string) {
  return row.end > now;
}

export function createBookingsService(): BookingsApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Booking>('bookings', []);
    },
    async byResident(residentId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Booking>('bookings', []).filter(
        (r) => r.bookedById === residentId,
      );
    },
    async byFacility(facilityId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Booking>('bookings', []).filter(
        (r) => r.facilityId === facilityId,
      );
    },
    async create(input: CreateBookingInput) {
      await delay(MOCK_LATENCY_MS);
      const all = readCollection<Booking>('bookings', []);
      const facilityRows = all.filter((r) => r.facilityId === input.facilityId);
      if (facilityRows.some((r) => overlaps(r, input))) {
        throw new Error('booking_overlap');
      }
      const now = new Date().toISOString();
      const futureForResident = all.filter(
        (r) =>
          r.bookedById === input.bookedById &&
          r.facilityType === input.facilityType &&
          isFuture(r, now),
      );
      if (futureForResident.length >= MAX_FUTURE_BOOKINGS_PER_FACILITY) {
        throw new Error('booking_limit');
      }
      const row: Booking = { id: generateId(), ...input };
      upsertById<Booking>('bookings', row);
      return row;
    },
    async cancel(bookingId) {
      await delay(MOCK_LATENCY_MS);
      removeById<Booking>('bookings', bookingId);
    },
  };
}
