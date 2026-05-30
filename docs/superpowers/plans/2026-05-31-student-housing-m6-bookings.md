# Student Housing App — Milestone 6 (Bookings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let residents browse and book facilities in their own building, with a rules engine that prevents double-bookings and enforces a 2-future-booking-per-facility-type limit; let admin/staff see and cancel any booking.

**Architecture:** Add `bookings` to the mock `Api`. The service is the rules engine: it rejects overlapping slots for the same facility and rejects creates that would push a resident over `MAX_FUTURE_BOOKINGS_PER_FACILITY` (from `config/constants`, already 2). Two slot models keyed by `Facility.type`:

- **Laundry / sauna** → discrete 3-hour slots per day (`SLOT_TEMPLATES`).
- **Guest room / common room** → single full-day slot per day (overnight model: 14:00 → 14:00 next day for guest room; 09:00–22:00 for common room).

A pure `slotGeneration.ts` helper produces candidate slots for a given facility type + date. The UI renders these as a grid; each slot's status (`available` / `mine` / `taken`) is derived from existing bookings.

**Tech Stack:** No new deps; `dayjs` (already installed) for date math.

---

## Plan series context

This is **plan 6 of 8**. Previous: M1–M5.

### Scope clarifications

- **Building scoping**: a resident's building is derived from their `Property.buildingId`. They see only facilities with `buildingId === theirs`. Pending residents (no property) get an empty list.
- **Rules engine returns rich errors**: service throws `Error('booking_overlap')` or `Error('booking_limit')`; the UI maps these to translated alerts.
- **Cancellation**: residents can cancel only future bookings they own; admin can cancel any.
- **Past bookings**: the booking list filters past entries by default; residents see "future only", admin has a toggle.
- **No timezone math**: ISO strings are compared lexically. All times are UTC-ish from `dayjs(...).toISOString()`.

---

## File structure map (M6 additions)

```
src/
  app/routes.tsx                                  ✦ adds /admin/bookings, /bookings
  components/AdminLayout.tsx                      ✦ adds Bokningar entry
  components/ResidentLayout.tsx                   ✦ adds Boka tab
  features/bookings/
    slotGeneration.ts                             ✦ pure helper
    slotGeneration.test.ts                        ✦
    BookingSlotGrid.tsx                           ✦ render slots for a (facility, day)
    ResidentBookingsPage.tsx                      ✦
    AdminBookingsPage.tsx                         ✦
    ResidentBookingsPage.test.tsx                 ✦
    AdminBookingsPage.test.tsx                    ✦
  services/
    api.ts                                        ✦ adds BookingsApi
    hooks/queryKeys.ts                            ✦ + facility/booking keys
    hooks/bookings.ts                             ✦
    mock/fixtures.ts                              ✦ + booking fixtures
    mock/seed.ts                                  ✦
    mock/bookingsService.ts                       ✦
    mock/bookingsService.test.ts                  ✦
    mock/index.ts                                 ✦
  i18n/locales/sv.json, en.json                   ✦ + bookings.* / nav.bookings
```

---

## Task 0: Booking fixtures + seed

Seed two existing bookings so the demo isn't empty: one in the future (an admin can see it), one near today's tests.

**Files:** modify `fixtures.ts`, `seed.ts`, `seed.test.ts`.

- [ ] **Step 1: Append fixtures**

In `fixtures.ts`, add `Booking` to the imports and append:

```ts
export const bookingFixtures: Booking[] = [
  {
    id: 'bk-1',
    facilityType: 'laundry',
    facilityId: 'f-n-laundry',
    bookedById: 'u-res1',
    start: '2026-06-05T09:00:00Z',
    end: '2026-06-05T12:00:00Z',
  },
  {
    id: 'bk-2',
    facilityType: 'sauna',
    facilityId: 'f-n-sauna',
    bookedById: 'u-res2',
    start: '2026-06-06T17:00:00Z',
    end: '2026-06-06T20:00:00Z',
  },
];
```

- [ ] **Step 2: Update `seed.ts`**

Add `bookingFixtures` to imports and add:

```ts
if (!hasKey('bookings')) writeCollection('bookings', bookingFixtures);
```

- [ ] **Step 3: Extend `seed.test.ts`**

Add a new `it` inside the existing `describe`:

```ts
it('seeds bookings for demo', () => {
  seedDatabase();
  const rows = readCollection<import('@/types').Booking>('bookings', []);
  expect(rows.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 4**: Run `npx vitest run src/services/mock/seed` + typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/services/mock
git commit -m "feat(m6): seed sample bookings for laundry and sauna"
```

---

## Task 1: Slot generation utility

Pure functions. Tested in isolation.

**Files:** create `src/features/bookings/slotGeneration.ts` + test.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/bookings/slotGeneration`

- [ ] **Step 3: Write `slotGeneration.ts`**

```ts
import type { FacilityType } from '@/types';

export interface Slot {
  start: string;
  end: string;
}

interface SlotTemplate {
  hours: Array<[number, number]>; // [startHour, endHour]
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
```

- [ ] **Step 4**: Run tests — PASS (5).

- [ ] **Step 5: Commit**

```bash
git add src/features/bookings/slotGeneration.ts src/features/bookings/slotGeneration.test.ts
git commit -m "feat(m6): add facility slot generation helper"
```

---

## Task 2: BookingsApi + mock service (rules engine)

**Files:** modify `api.ts`, create `mock/bookingsService.ts` + test, modify `mock/index.ts`.

- [ ] **Step 1: Write the failing test**

```ts
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
    // u-res2 already has bk-2 (sauna). Add one more sauna booking to reach 2,
    // then a third should be rejected.
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
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/services/mock/bookingsService`

- [ ] **Step 3: Extend `api.ts`**

```ts
import type {
  Booking, Contract, Conversation, Invoice, MaintenanceCategory, MaintenanceRequest,
  MaintenanceStatus, Message, Property, SafeUser,
} from '@/types';

// ...

export interface CreateBookingInput {
  facilityType: import('@/types').FacilityType;
  facilityId: string;
  bookedById: string;
  start: string;
  end: string;
}

export interface BookingsApi {
  list(): Promise<Booking[]>;
  byResident(residentId: string): Promise<Booking[]>;
  byFacility(facilityId: string): Promise<Booking[]>;
  create(input: CreateBookingInput): Promise<Booking>;
  cancel(bookingId: string): Promise<void>;
}

export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
  maintenance: MaintenanceApi;
  chat: ChatApi;
  economy: EconomyApi;
  bookings: BookingsApi;
}
```

- [ ] **Step 4: Write `src/services/mock/bookingsService.ts`**

```ts
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
```

- [ ] **Step 5: Wire `mock/index.ts`**

```ts
import { createBookingsService } from './bookingsService';
// ...
return {
  // existing,
  bookings: createBookingsService(),
};
```

- [ ] **Step 6**: Tests + typecheck.

- [ ] **Step 7: Commit**

```bash
git add src/services
git commit -m "feat(m6): add bookings mock service with overlap + per-type limit rules"
```

---

## Task 3: Query hooks + i18n

**Files:** modify `queryKeys.ts`, create `hooks/bookings.ts`, modify locale files.

- [ ] **Step 1: Extend `queryKeys.ts`**

```ts
  bookings: () => ['bookings'] as const,
  bookingsByResident: (residentId: string) => ['bookings', 'byResident', residentId] as const,
  bookingsByFacility: (facilityId: string) => ['bookings', 'byFacility', facilityId] as const,
```

- [ ] **Step 2: Write `hooks/bookings.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBookingInput } from '@/services/api';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useBookings() {
  return useQuery({ queryKey: keys.bookings(), queryFn: () => api.bookings.list() });
}

export function useBookingsByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId
      ? keys.bookingsByResident(residentId)
      : ['bookings', 'byResident', 'none'],
    queryFn: () => api.bookings.byResident(residentId as string),
    enabled: Boolean(residentId),
  });
}

export function useBookingsByFacility(facilityId: string | undefined) {
  return useQuery({
    queryKey: facilityId
      ? keys.bookingsByFacility(facilityId)
      : ['bookings', 'byFacility', 'none'],
    queryFn: () => api.bookings.byFacility(facilityId as string),
    enabled: Boolean(facilityId),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.bookings.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.bookings.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
```

- [ ] **Step 3: Add i18n**

`sv.json`, root:

```json
"bookings": {
  "title": "Bokningar",
  "myTitle": "Mina bokningar",
  "facility": "Lokal",
  "selectFacility": "Välj lokal",
  "selectDate": "Datum",
  "book": "Boka",
  "cancel": "Avboka",
  "yourBooking": "Din bokning",
  "taken": "Bokad",
  "available": "Ledig",
  "empty": "Inga bokningar",
  "noFacilities": "Inga lokaler i din byggnad",
  "futureOnly": "Endast framtida",
  "facilityType": "Typ",
  "start": "Start",
  "end": "Slut",
  "bookedBy": "Bokad av",
  "errorOverlap": "Tiden är redan bokad",
  "errorLimit": "Du har redan max antal framtida bokningar för denna typ",
  "confirmCancel": "Avboka denna bokning?",
  "types": {
    "laundry": "Tvättstuga",
    "sauna": "Bastu",
    "common_room": "Gemensamhetsrum",
    "guest_room": "Gästrum"
  }
},
```

Inside `nav`: `"bookings": "Bokningar"`.

`en.json` mirror:

```json
"bookings": {
  "title": "Bookings",
  "myTitle": "My bookings",
  "facility": "Facility",
  "selectFacility": "Pick a facility",
  "selectDate": "Date",
  "book": "Book",
  "cancel": "Cancel",
  "yourBooking": "Your booking",
  "taken": "Taken",
  "available": "Available",
  "empty": "No bookings",
  "noFacilities": "No facilities in your building",
  "futureOnly": "Future only",
  "facilityType": "Type",
  "start": "Start",
  "end": "End",
  "bookedBy": "Booked by",
  "errorOverlap": "That time is already booked",
  "errorLimit": "You already have the max future bookings for this type",
  "confirmCancel": "Cancel this booking?",
  "types": {
    "laundry": "Laundry",
    "sauna": "Sauna",
    "common_room": "Common room",
    "guest_room": "Guest room"
  }
},
```

Inside `nav`: `"bookings": "Bookings"`.

- [ ] **Step 4**: Typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/services/hooks src/i18n
git commit -m "feat(m6): add bookings query hooks and i18n"
```

---

## Task 4: ResidentBookingsPage

The most involved view: facility picker → date picker → slot grid + a "my bookings" list with cancel.

**Files:** create `ResidentBookingsPage.tsx` + test, and `BookingSlotGrid.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentBookingsPage } from '@/features/bookings/ResidentBookingsPage';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentBookingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('lists facilities only from the resident\'s building (Norra)', async () => {
    renderWithProviders(<ResidentBookingsPage />, { route: '/bookings' });
    await userEvent.click(await screen.findByLabelText(/välj lokal/i));
    // Norra facilities present
    expect(await screen.findByRole('option', { name: /tvättstuga norra/i })).toBeInTheDocument();
    // Södra facilities absent
    expect(screen.queryByRole('option', { name: /tvättstuga södra/i })).not.toBeInTheDocument();
  });

  it('shows my existing bookings in the "my bookings" panel', async () => {
    renderWithProviders(<ResidentBookingsPage />, { route: '/bookings' });
    await waitFor(() =>
      expect(screen.getByText(/2026-06-05/)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run to fail**

- [ ] **Step 3: Write `BookingSlotGrid.tsx`**

```tsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { Booking, FacilityType } from '@/types';
import { generateSlots, type Slot } from './slotGeneration';

interface Props {
  facilityType: FacilityType;
  date: string;
  existing: Booking[];
  currentUserId: string;
  onBook: (slot: Slot) => void;
  bookDisabled?: boolean;
}

function statusFor(slot: Slot, existing: Booking[], currentUserId: string) {
  const conflict = existing.find(
    (b) => b.start < slot.end && slot.start < b.end,
  );
  if (!conflict) return 'available' as const;
  return conflict.bookedById === currentUserId ? ('mine' as const) : ('taken' as const);
}

export function BookingSlotGrid({
  facilityType, date, existing, currentUserId, onBook, bookDisabled,
}: Props) {
  const { t } = useTranslation();
  const slots = useMemo(() => generateSlots(facilityType, date), [facilityType, date]);
  return (
    <Stack sx={{ gap: 1 }}>
      {slots.map((slot) => {
        const status = statusFor(slot, existing, currentUserId);
        const time = `${slot.start.slice(11, 16)}–${slot.end.slice(11, 16)}`;
        return (
          <Stack key={slot.start} direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <Typography sx={{ width: 120 }}>{time}</Typography>
            {status === 'available' && (
              <Button
                variant="contained"
                size="small"
                disabled={bookDisabled}
                onClick={() => onBook(slot)}
              >
                {t('bookings.book')}
              </Button>
            )}
            {status === 'mine' && (
              <Typography color="primary">{t('bookings.yourBooking')}</Typography>
            )}
            {status === 'taken' && (
              <Typography color="text.secondary">{t('bookings.taken')}</Typography>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
```

- [ ] **Step 4: Write `ResidentBookingsPage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import dayjs from 'dayjs';
import type { Facility, Property } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { readCollection } from '@/services/mock/storage';
import {
  useBookingsByFacility, useBookingsByResident, useCancelBooking, useCreateBooking,
} from '@/services/hooks/bookings';
import { BookingSlotGrid } from './BookingSlotGrid';

export function ResidentBookingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const myBuildingId = useMemo(() => {
    if (!user) return undefined;
    return readCollection<Property>('properties', []).find((p) => p.residentId === user.id)?.buildingId;
  }, [user]);

  const facilities = useMemo(
    () =>
      readCollection<Facility>('facilities', []).filter(
        (f) => f.buildingId === myBuildingId,
      ),
    [myBuildingId],
  );

  const [facilityId, setFacilityId] = useState<string>(facilities[0]?.id ?? '');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const facility = facilities.find((f) => f.id === facilityId);
  const facilityBookings = useBookingsByFacility(facilityId || undefined);
  const myBookings = useBookingsByResident(user?.id);
  const createBooking = useCreateBooking();
  const cancelBooking = useCancelBooking();

  async function book(slot: { start: string; end: string }) {
    if (!facility || !user) return;
    setErrorMsg(null);
    try {
      await createBooking.mutateAsync({
        facilityType: facility.type,
        facilityId: facility.id,
        bookedById: user.id,
        start: slot.start,
        end: slot.end,
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'booking_overlap') setErrorMsg(t('bookings.errorOverlap'));
      else if (msg === 'booking_limit') setErrorMsg(t('bookings.errorLimit'));
      else setErrorMsg(msg);
    }
  }

  if (!myBuildingId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 2 }}>{t('bookings.title')}</Typography>
        <Typography color="text.secondary">{t('bookings.noFacilities')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('bookings.title')}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2 }}>
        <TextField
          select
          label={t('bookings.selectFacility')}
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {facilities.map((f) => (
            <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label={t('bookings.selectDate')}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      {errorMsg && <Alert severity="warning" sx={{ mb: 2 }}>{errorMsg}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>{facility?.label}</Typography>
          {facilityBookings.isLoading || !facility
            ? <Skeleton variant="rectangular" height={200} />
            : <BookingSlotGrid
                facilityType={facility.type}
                date={date}
                existing={facilityBookings.data ?? []}
                currentUserId={user?.id ?? ''}
                onBook={book}
                bookDisabled={createBooking.isPending}
              />}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>{t('bookings.myTitle')}</Typography>
      {myBookings.isLoading
        ? <Skeleton variant="rectangular" height={120} />
        : (myBookings.data ?? []).length === 0
          ? <Typography color="text.secondary">{t('bookings.empty')}</Typography>
          : (
            <Stack sx={{ gap: 1 }}>
              {(myBookings.data ?? []).map((b) => (
                <Card key={b.id}>
                  <CardContent>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t(`bookings.types.${b.facilityType}`)}
                        </Typography>
                        <Typography>
                          {b.start.slice(0, 10)} {b.start.slice(11, 16)}–{b.end.slice(11, 16)}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => cancelBooking.mutateAsync(b.id)}
                      >
                        {t('bookings.cancel')}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
    </Box>
  );
}
```

- [ ] **Step 5**: Run tests — PASS (2).

- [ ] **Step 6: Commit**

```bash
git add src/features/bookings/ResidentBookingsPage.tsx src/features/bookings/ResidentBookingsPage.test.tsx src/features/bookings/BookingSlotGrid.tsx
git commit -m "feat(m6): add resident bookings page with slot grid and my-bookings list"
```

---

## Task 5: AdminBookingsPage

**Files:** create `AdminBookingsPage.tsx` + test.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminBookingsPage } from '@/features/bookings/AdminBookingsPage';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminBookingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('lists every seeded booking with the resident name', async () => {
    renderWithProviders(<AdminBookingsPage />, { route: '/admin/bookings' });
    await waitFor(() => expect(screen.getByText(/rasmus resident/i)).toBeInTheDocument());
    expect(screen.getByText(/rebecka resident/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

- [ ] **Step 3: Write `AdminBookingsPage.tsx`**

```tsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Booking, Facility } from '@/types';
import { useBookings, useCancelBooking } from '@/services/hooks/bookings';
import { useUsers } from '@/services/hooks/users';
import { readCollection } from '@/services/mock/storage';
import Button from '@mui/material/Button';

export function AdminBookingsPage() {
  const { t } = useTranslation();
  const bookings = useBookings();
  const users = useUsers();
  const cancel = useCancelBooking();

  const userById = useMemo(
    () => new Map(users.data?.map((u) => [u.id, u]) ?? []),
    [users.data],
  );
  const facilityById = useMemo(
    () => new Map(readCollection<Facility>('facilities', []).map((f) => [f.id, f])),
    [],
  );

  const columns: GridColDef<Booking>[] = [
    {
      field: 'facilityType',
      headerName: t('bookings.facilityType'),
      width: 160,
      renderCell: (p) => t(`bookings.types.${p.row.facilityType}`),
    },
    {
      field: 'facilityId',
      headerName: t('bookings.facility'),
      flex: 1,
      renderCell: (p) => facilityById.get(p.row.facilityId)?.label ?? p.row.facilityId,
    },
    {
      field: 'bookedById',
      headerName: t('bookings.bookedBy'),
      width: 180,
      renderCell: (p) => userById.get(p.row.bookedById)?.name ?? p.row.bookedById,
    },
    {
      field: 'start',
      headerName: t('bookings.start'),
      width: 180,
      valueFormatter: (value: string) => value.replace('T', ' ').slice(0, 16),
    },
    {
      field: 'end',
      headerName: t('bookings.end'),
      width: 180,
      valueFormatter: (value: string) => value.replace('T', ' ').slice(0, 16),
    },
    {
      field: 'actions',
      headerName: ' ',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Button size="small" color="error" onClick={() => cancel.mutateAsync(p.row.id)}>
          {t('bookings.cancel')}
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('bookings.title')}</Typography>
      </Stack>
      {bookings.isLoading
        ? <Skeleton variant="rectangular" height={400} />
        : <DataGrid
            autoHeight
            rows={bookings.data ?? []}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            localeText={(bookings.data ?? []).length === 0 ? { noRowsLabel: t('bookings.empty') } : undefined}
          />}
    </Box>
  );
}
```

- [ ] **Step 4**: Run tests — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/bookings/AdminBookingsPage.tsx src/features/bookings/AdminBookingsPage.test.tsx
git commit -m "feat(m6): add admin bookings DataGrid with cancel action"
```

---

## Task 6: Routes + nav

**Files:** modify `routes.tsx`, `AdminLayout.tsx`, `ResidentLayout.tsx`.

- [ ] **Step 1: routes.tsx**

Add imports + nested route under `/admin`:

```tsx
import { AdminBookingsPage } from '@/features/bookings/AdminBookingsPage';
import { ResidentBookingsPage } from '@/features/bookings/ResidentBookingsPage';

// inside /admin children:
<Route path="bookings" element={<AdminBookingsPage />} />

// inside resident layout:
<Route path="/bookings" element={<ResidentBookingsPage />} />
```

- [ ] **Step 2: AdminLayout**

```tsx
import EventNoteIcon from '@mui/icons-material/EventNote';
// inside items:
{ to: '/admin/bookings', icon: <EventNoteIcon />, label: t('nav.bookings'), end: false },
```

- [ ] **Step 3: ResidentLayout**

```tsx
import EventNoteIcon from '@mui/icons-material/EventNote';
// extend value derivation: include pathname.startsWith('/bookings') → '/bookings'
// add BottomNavigationAction value="/bookings" label={t('nav.bookings')} icon={<EventNoteIcon />}
```

- [ ] **Step 4**: Full test suite + typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/app src/components
git commit -m "feat(m6): wire bookings routes and nav links in both layouts"
```

---

## Task 7: Milestone verification

- [ ] **Step 1**: `npx vitest run` — all green.
- [ ] **Step 2**: `npm run typecheck` — clean.
- [ ] **Step 3**: `npm run build` — succeeds.
- [ ] **Step 4**: Manual smoke — admin Bokningar lists 2 seeded; resident Boka picks facility + date, slot grid renders correct status, booking creates and appears in "my bookings"; cancel removes; overlap and limit errors surface with translated text.

---

## Definition of done (Milestone 6)

- Service rules engine enforces overlap and per-facility-type limit.
- Residents book and cancel slots in their own building; admin sees and cancels all bookings.
- `npx vitest run`, `npm run typecheck`, `npm run build` green.
