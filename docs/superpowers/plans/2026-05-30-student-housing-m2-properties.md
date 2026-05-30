# Student Housing App — Milestone 2 (Admin properties) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admin/staff full property management — dashboard with live counts, searchable/filterable DataGrid, detail page with resident + contract, create/edit dialog, and an "invite resident" flow that creates a `pending` user routed through a new `/onboarding` page.

**Architecture:** Extend the M1 mock service with `properties`, `contracts`, and `users` endpoints, all reading/writing localStorage through the existing `readCollection`/`writeCollection` helpers (a new `byId/upsert/remove` layer on top). Async state is TanStack Query — every read is a `useQuery`, every write a `useMutation` that invalidates the matching keys. A new `AdminLayout` (AppBar + persistent Drawer) hosts nested `/admin/*` routes. Onboarding is a separate guarded route; auth flow now branches `pending` residents to it.

**Tech Stack:** Adds nothing to the M1 stack — uses `@mui/x-data-grid`, `@tanstack/react-query`, `react-hook-form` + `zod`, MUI v6, `dayjs`. Tests: Vitest + React Testing Library.

---

## Plan series context

This is **plan 2 of 8**. Previous plan: [M1 scaffold](./2026-05-30-student-housing-m1-scaffold.md). Authoritative references:

- Base spec: [`student-housing-spec.md`](../../../student-housing-spec.md)
- Design decisions: [`docs/superpowers/specs/2026-05-30-student-housing-design.md`](../specs/2026-05-30-student-housing-design.md)

### Scope clarifications (deferred to later milestones)

The base spec lists six dashboard cards. Three depend on later milestones and render placeholder zeros in M2:

- **"Open maintenance"** → real count in M3.
- **"Unpaid rent"** → real count in M5.
- **"Upcoming move-outs"** → real count in M7.

Property detail shows a placeholder "Maintenance history" section that M3 populates. The full invite UI (admin's "share temp password" Dialog) ships in M2; onboarding ships in M2 (a `pending` resident is part of the seed data, so the flow is end-to-end testable now).

---

## File structure map (M2 additions)

Files **created or modified in this milestone** are marked ✦. Other files exist from M1.

```
src/
  app/
    routes.tsx                          ✦ adds /admin/properties, /admin/properties/:id, /onboarding
  auth/
    AuthContext.tsx                     ✦ (no surface change; password update method added)
    guards.tsx                          ✦ adds RequirePending (pending residents only)
    paths.ts                            ✦ adds onboarding redirect for pending users
  components/
    StatusChip.tsx                      ✦ shared status chip (property/maintenance/invoice)
    AdminLayout.tsx                     ✦ AppBar + persistent Drawer shell
    AppBarActions.tsx                   ✦ theme toggle + lang toggle + logout
    StatusChip.test.tsx                 ✦
  features/
    auth/
      OnboardingPage.tsx                ✦ set-password form for pending users
      OnboardingPage.test.tsx           ✦
    dashboard/
      AdminDashboard.tsx                ✦ replaces M1 placeholder; summary cards
      AdminDashboard.test.tsx           ✦
    properties/
      PropertiesPage.tsx                ✦ DataGrid + search/filter
      PropertyDetailPage.tsx            ✦ info + resident + contract + invite button
      PropertyFormDialog.tsx            ✦ create/edit
      InviteResidentDialog.tsx          ✦ invite form → temp-password reveal
      PropertiesPage.test.tsx           ✦
      PropertyDetailPage.test.tsx       ✦
      PropertyFormDialog.test.tsx       ✦
      InviteResidentDialog.test.tsx     ✦
  services/
    api.ts                              ✦ extends Api with properties/contracts/users
    hooks/
      queryKeys.ts                      ✦ central key factory
      properties.ts                     ✦ useProperties/useProperty + mutations
      contracts.ts                      ✦ useContractByProperty
      users.ts                          ✦ useUsers + mutations (invite, set password)
    mock/
      storage.ts                        ✦ adds byId/upsertById/removeById on top of read/write
      storage.test.ts                   ✦ new cases for typed CRUD
      fixtures.ts                       ✦ buildings, facilities, properties, contracts, +residents
      seed.ts                           ✦ seeds the new collections
      propertiesService.ts              ✦ CRUD for Property
      contractsService.ts               ✦ get/upsert for Contract
      usersService.ts                   ✦ list, invite, setPassword
      index.ts                          ✦ wires the new services into createMockApi
      propertiesService.test.ts         ✦
      contractsService.test.ts          ✦
      usersService.test.ts              ✦
  test/
    renderWithProviders.tsx             ✦ ensures `<Routes>` outside; no surface change expected
```

**Convention reminder:** path alias `@/` → `src/`. All non-relative imports use it.

---

## Task 0: Typed CRUD storage helpers

**Files:**
- Modify: `src/services/mock/storage.ts`
- Modify: `src/services/mock/storage.test.ts`

- [ ] **Step 1: Extend the failing test**

Append to `src/services/mock/storage.test.ts`:

```ts
import { byId, upsertById, removeById } from '@/services/mock/storage';

interface IdRow { id: string; v: number }

describe('typed CRUD over collections', () => {
  beforeEach(() => localStorage.clear());

  it('byId returns the matching row or undefined', () => {
    writeCollection<IdRow>('rows', [{ id: 'a', v: 1 }, { id: 'b', v: 2 }]);
    expect(byId<IdRow>('rows', 'a')).toEqual({ id: 'a', v: 1 });
    expect(byId<IdRow>('rows', 'missing')).toBeUndefined();
  });

  it('upsertById inserts a new row when id is absent', () => {
    upsertById<IdRow>('rows', { id: 'a', v: 1 });
    expect(readCollection<IdRow>('rows', [])).toEqual([{ id: 'a', v: 1 }]);
  });

  it('upsertById replaces an existing row by id', () => {
    upsertById<IdRow>('rows', { id: 'a', v: 1 });
    upsertById<IdRow>('rows', { id: 'a', v: 99 });
    expect(readCollection<IdRow>('rows', [])).toEqual([{ id: 'a', v: 99 }]);
  });

  it('removeById drops the matching row and is a no-op for missing ids', () => {
    upsertById<IdRow>('rows', { id: 'a', v: 1 });
    upsertById<IdRow>('rows', { id: 'b', v: 2 });
    removeById<IdRow>('rows', 'a');
    expect(readCollection<IdRow>('rows', [])).toEqual([{ id: 'b', v: 2 }]);
    removeById<IdRow>('rows', 'missing');
    expect(readCollection<IdRow>('rows', [])).toEqual([{ id: 'b', v: 2 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/services/mock/storage`
Expected: FAIL — `byId`, `upsertById`, `removeById` not exported.

- [ ] **Step 3: Extend `src/services/mock/storage.ts`**

Append after the existing helpers:

```ts
interface HasId { id: string }

export function byId<T extends HasId>(name: string, id: string): T | undefined {
  return readCollection<T>(name, []).find((row) => row.id === id);
}

export function upsertById<T extends HasId>(name: string, row: T): void {
  const rows = readCollection<T>(name, []);
  const i = rows.findIndex((r) => r.id === row.id);
  if (i >= 0) rows[i] = row;
  else rows.push(row);
  writeCollection<T>(name, rows);
}

export function removeById<T extends HasId>(name: string, id: string): void {
  const rows = readCollection<T>(name, []);
  const next = rows.filter((r) => r.id !== id);
  if (next.length !== rows.length) writeCollection<T>(name, next);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/services/mock/storage`
Expected: PASS (7 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/services/mock/storage.ts src/services/mock/storage.test.ts
git commit -m "feat(m2): add typed byId/upsertById/removeById on mock storage"
```

---

## Task 1: Fixture extensions (buildings, properties, contracts, facilities, residents)

**Files:**
- Add: `Building` type to `src/types/index.ts`
- Modify: `src/services/mock/fixtures.ts`
- Modify: `src/services/mock/seed.ts`
- Modify: `src/services/mock/seed.test.ts`

> Buildings group properties + facilities (design doc D8). M2 only consumes `Property`, `Contract`, `User`. `Facility` + `Booking` are seeded now so M6 can rely on the existing seed.

- [ ] **Step 1: Add the `Building` type**

In `src/types/index.ts`, append:

```ts
export interface Building {
  id: string;
  name: string;
  address: string;
}
```

- [ ] **Step 2: Extend the seed test**

Replace the body of `describe('seedDatabase', …)` in `src/services/mock/seed.test.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { seedDatabase } from '@/services/mock/seed';
import { readCollection } from '@/services/mock/storage';
import type { Building, Contract, Facility, Property, User } from '@/types';

describe('seedDatabase', () => {
  beforeEach(() => localStorage.clear());

  it('seeds users (incl. one pending resident)', () => {
    seedDatabase();
    const users = readCollection<User>('users', []);
    expect(users.map((u) => u.username).sort()).toEqual(
      ['admin', 'pending', 'resident', 'resident2', 'staff'],
    );
    expect(users.find((u) => u.username === 'pending')?.status).toBe('pending');
  });

  it('seeds buildings, properties, contracts and facilities', () => {
    seedDatabase();
    expect(readCollection<Building>('buildings', [])).toHaveLength(2);
    const properties = readCollection<Property>('properties', []);
    expect(properties.length).toBeGreaterThanOrEqual(8);
    expect(properties.every((p) => p.buildingId)).toBe(true);
    expect(readCollection<Contract>('contracts', []).length).toBeGreaterThan(0);
    expect(readCollection<Facility>('facilities', []).length).toBeGreaterThanOrEqual(8);
  });

  it('is idempotent across all collections', () => {
    seedDatabase();
    const first = readCollection<Property>('properties', []);
    first[0].name = 'EDITED';
    localStorage.setItem('studhem.v1.properties', JSON.stringify(first));
    seedDatabase();
    const after = readCollection<Property>('properties', []);
    expect(after.find((p) => p.id === first[0].id)?.name).toBe('EDITED');
  });
});
```

- [ ] **Step 3: Run tests to confirm fail**

Run: `npm run test:run -- src/services/mock/seed`
Expected: FAIL — missing seeded collections.

- [ ] **Step 4: Rewrite `src/services/mock/fixtures.ts`**

```ts
import type { Building, Contract, Facility, Property, User } from '@/types';

export const userFixtures: User[] = [
  { id: 'u-admin', name: 'Anna Admin', email: 'anna@studhem.se', username: 'admin',
    role: 'admin', password: 'admin123', status: 'active' },
  { id: 'u-staff', name: 'Sven Staff', email: 'sven@studhem.se', username: 'staff',
    role: 'staff', password: 'staff123', status: 'active' },
  { id: 'u-res1', name: 'Rasmus Resident', email: 'rasmus@student.se', username: 'resident',
    role: 'resident', password: 'resident123', status: 'active' },
  { id: 'u-res2', name: 'Rebecka Resident', email: 'rebecka@student.se', username: 'resident2',
    role: 'resident', password: 'resident123', status: 'active' },
  { id: 'u-pending', name: 'Pia Pending', email: 'pia@student.se', username: 'pending',
    role: 'resident', password: 'temp-xyz', status: 'pending' },
];

export const buildingFixtures: Building[] = [
  { id: 'b-norra', name: 'Norra Huset', address: 'Studentvägen 1' },
  { id: 'b-sodra', name: 'Södra Huset', address: 'Studentvägen 2' },
];

export const propertyFixtures: Property[] = [
  { id: 'p-101', name: 'Rum 101', address: 'Studentvägen 1', roomType: 'corridor room',
    rent: 4200, status: 'occupied', residentId: 'u-res1', buildingId: 'b-norra' },
  { id: 'p-102', name: 'Rum 102', address: 'Studentvägen 1', roomType: 'corridor room',
    rent: 4200, status: 'occupied', residentId: 'u-res2', buildingId: 'b-norra' },
  { id: 'p-103', name: 'Rum 103', address: 'Studentvägen 1', roomType: 'corridor room',
    rent: 4200, status: 'vacant', buildingId: 'b-norra' },
  { id: 'p-104', name: 'Studio 104', address: 'Studentvägen 1', roomType: 'studio',
    rent: 6500, status: 'vacant', buildingId: 'b-norra' },
  { id: 'p-201', name: 'Rum 201', address: 'Studentvägen 2', roomType: 'corridor room',
    rent: 4300, status: 'vacant', buildingId: 'b-sodra' },
  { id: 'p-202', name: 'Rum 202', address: 'Studentvägen 2', roomType: 'corridor room',
    rent: 4300, status: 'vacant', buildingId: 'b-sodra' },
  { id: 'p-203', name: 'Studio 203', address: 'Studentvägen 2', roomType: 'studio',
    rent: 6700, status: 'vacant', buildingId: 'b-sodra' },
  { id: 'p-204', name: 'Studio 204', address: 'Studentvägen 2', roomType: 'studio',
    rent: 6700, status: 'vacant', buildingId: 'b-sodra' },
];

export const contractFixtures: Contract[] = [
  { id: 'c-1', propertyId: 'p-101', residentId: 'u-res1', startDate: '2026-01-01',
    rent: 4200, terms: 'Standardvillkor', status: 'active' },
  { id: 'c-2', propertyId: 'p-102', residentId: 'u-res2', startDate: '2026-02-01',
    rent: 4200, terms: 'Standardvillkor', status: 'active' },
];

export const facilityFixtures: Facility[] = [
  { id: 'f-n-laundry', type: 'laundry',     buildingId: 'b-norra', label: 'Tvättstuga Norra' },
  { id: 'f-n-sauna',   type: 'sauna',       buildingId: 'b-norra', label: 'Bastu Norra' },
  { id: 'f-n-common',  type: 'common_room', buildingId: 'b-norra', label: 'Gemensamhetsrum Norra' },
  { id: 'f-n-guest',   type: 'guest_room',  buildingId: 'b-norra', label: 'Gästrum Norra' },
  { id: 'f-s-laundry', type: 'laundry',     buildingId: 'b-sodra', label: 'Tvättstuga Södra' },
  { id: 'f-s-sauna',   type: 'sauna',       buildingId: 'b-sodra', label: 'Bastu Södra' },
  { id: 'f-s-common',  type: 'common_room', buildingId: 'b-sodra', label: 'Gemensamhetsrum Södra' },
  { id: 'f-s-guest',   type: 'guest_room',  buildingId: 'b-sodra', label: 'Gästrum Södra' },
];
```

- [ ] **Step 5: Rewrite `src/services/mock/seed.ts`**

```ts
import { hasKey, writeCollection } from './storage';
import {
  buildingFixtures, contractFixtures, facilityFixtures,
  propertyFixtures, userFixtures,
} from './fixtures';

/** Seeds each collection only if it has never been written. Safe to call on every boot. */
export function seedDatabase(): void {
  if (!hasKey('users')) writeCollection('users', userFixtures);
  if (!hasKey('buildings')) writeCollection('buildings', buildingFixtures);
  if (!hasKey('properties')) writeCollection('properties', propertyFixtures);
  if (!hasKey('contracts')) writeCollection('contracts', contractFixtures);
  if (!hasKey('facilities')) writeCollection('facilities', facilityFixtures);
}
```

- [ ] **Step 6: Run all tests**

Run: `npm run test:run`
Expected: all green (the auth tests still seed via `beforeEach` and don't care about the new rows).

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types src/services/mock/fixtures.ts src/services/mock/seed.ts src/services/mock/seed.test.ts
git commit -m "feat(m2): seed buildings, properties, contracts, facilities, +residents"
```

---

## Task 2: Properties / contracts / users service interfaces + mock impl

**Files:**
- Modify: `src/services/api.ts`
- Create: `src/services/mock/propertiesService.ts`
- Create: `src/services/mock/contractsService.ts`
- Create: `src/services/mock/usersService.ts`
- Modify: `src/services/mock/index.ts`
- Create: `src/services/mock/propertiesService.test.ts`
- Create: `src/services/mock/contractsService.test.ts`
- Create: `src/services/mock/usersService.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/services/mock/propertiesService.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('properties service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('list returns all seeded properties', async () => {
    const rows = await api.properties.list();
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it('get returns a single property by id', async () => {
    const row = await api.properties.get('p-101');
    expect(row?.id).toBe('p-101');
  });

  it('create assigns an id and appends the property', async () => {
    const before = (await api.properties.list()).length;
    const created = await api.properties.create({
      name: 'Rum 999', address: 'Test', roomType: 'corridor room',
      rent: 4000, status: 'vacant', buildingId: 'b-norra',
    });
    expect(created.id).toMatch(/^p-/);
    expect((await api.properties.list()).length).toBe(before + 1);
  });

  it('update merges fields onto the existing row', async () => {
    const updated = await api.properties.update('p-101', { rent: 5000 });
    expect(updated.rent).toBe(5000);
    expect((await api.properties.get('p-101'))?.rent).toBe(5000);
  });

  it('remove drops the property', async () => {
    await api.properties.remove('p-103');
    expect(await api.properties.get('p-103')).toBeUndefined();
  });
});
```

`src/services/mock/contractsService.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
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
});
```

`src/services/mock/usersService.test.ts`:

```ts
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
    // logging in with the new password works
    const logged = await api.auth.login('pending', 'newpass1');
    expect(logged.id).toBe('u-pending');
  });
});
```

- [ ] **Step 2: Run them to verify failure**

Run: `npm run test:run -- src/services/mock/propertiesService src/services/mock/contractsService src/services/mock/usersService`
Expected: FAIL — `api.properties`, `api.contracts`, `api.users` undefined.

- [ ] **Step 3: Extend `src/services/api.ts`**

Replace with:

```ts
import type { Contract, Property, SafeUser } from '@/types';

export interface AuthApi {
  login(username: string, password: string): Promise<SafeUser>;
}

export interface PropertiesApi {
  list(): Promise<Property[]>;
  get(id: string): Promise<Property | undefined>;
  create(input: Omit<Property, 'id'>): Promise<Property>;
  update(id: string, patch: Partial<Omit<Property, 'id'>>): Promise<Property>;
  remove(id: string): Promise<void>;
}

export interface ContractsApi {
  byPropertyId(propertyId: string): Promise<Contract | undefined>;
}

export interface InviteInput {
  name: string;
  email: string;
  propertyId: string;
}

export interface InviteResult {
  user: SafeUser;
  tempPassword: string;
}

export interface UsersApi {
  list(): Promise<SafeUser[]>;
  get(id: string): Promise<SafeUser | undefined>;
  invite(input: InviteInput): Promise<InviteResult>;
  setPassword(userId: string, password: string): Promise<SafeUser>;
}

/** The backend contract. Mock impl today; a REST impl can replace it later. */
export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
}
```

- [ ] **Step 4: Write `src/services/mock/propertiesService.ts`**

```ts
import type { PropertiesApi } from '@/services/api';
import type { Property } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, removeById, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateId(): string {
  return `p-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPropertiesService(): PropertiesApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Property>('properties', []);
    },
    async get(id) {
      await delay(MOCK_LATENCY_MS);
      return byId<Property>('properties', id);
    },
    async create(input) {
      await delay(MOCK_LATENCY_MS);
      const row: Property = { ...input, id: generateId() };
      upsertById<Property>('properties', row);
      return row;
    },
    async update(id, patch) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Property>('properties', id);
      if (!existing) throw new Error(`property_not_found:${id}`);
      const merged: Property = { ...existing, ...patch, id };
      upsertById<Property>('properties', merged);
      return merged;
    },
    async remove(id) {
      await delay(MOCK_LATENCY_MS);
      removeById<Property>('properties', id);
    },
  };
}
```

- [ ] **Step 5: Write `src/services/mock/contractsService.ts`**

```ts
import type { ContractsApi } from '@/services/api';
import type { Contract } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { readCollection } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createContractsService(): ContractsApi {
  return {
    async byPropertyId(propertyId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Contract>('contracts', []).find(
        (c) => c.propertyId === propertyId && c.status !== 'ended',
      );
    },
  };
}
```

- [ ] **Step 6: Write `src/services/mock/usersService.ts`**

```ts
import type { InviteInput, InviteResult, UsersApi } from '@/services/api';
import type { Contract, Property, SafeUser, User } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function stripPassword(u: User): SafeUser {
  const { password: _omit, ...safe } = u;
  return safe;
}

function generateUserId(): string {
  return `u-${Math.random().toString(36).slice(2, 8)}`;
}

function generateContractId(): string {
  return `c-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTempPassword(): string {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function deriveUsername(email: string, existing: User[]): string {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const taken = new Set(existing.map((u) => u.username));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i += 1;
  return `${base}${i}`;
}

export function createUsersService(): UsersApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      return readCollection<User>('users', []).map(stripPassword);
    },
    async get(id) {
      await delay(MOCK_LATENCY_MS);
      const u = byId<User>('users', id);
      return u ? stripPassword(u) : undefined;
    },
    async invite({ name, email, propertyId }: InviteInput): Promise<InviteResult> {
      await delay(MOCK_LATENCY_MS);
      const property = byId<Property>('properties', propertyId);
      if (!property) throw new Error(`property_not_found:${propertyId}`);
      if (property.status === 'occupied') throw new Error(`property_occupied:${propertyId}`);

      const allUsers = readCollection<User>('users', []);
      const username = deriveUsername(email, allUsers);
      const tempPassword = generateTempPassword();
      const newUser: User = {
        id: generateUserId(),
        name,
        email,
        username,
        role: 'resident',
        password: tempPassword,
        status: 'pending',
      };
      upsertById<User>('users', newUser);

      // assign to property
      upsertById<Property>('properties', {
        ...property,
        status: 'occupied',
        residentId: newUser.id,
      });

      // draft contract — start today, terms placeholder, status 'active'
      const today = new Date().toISOString().slice(0, 10);
      const contract: Contract = {
        id: generateContractId(),
        propertyId,
        residentId: newUser.id,
        startDate: today,
        rent: property.rent,
        terms: 'Standardvillkor',
        status: 'active',
      };
      upsertById<Contract>('contracts', contract);

      return { user: stripPassword(newUser), tempPassword };
    },
    async setPassword(userId, password) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<User>('users', userId);
      if (!existing) throw new Error(`user_not_found:${userId}`);
      const updated: User = { ...existing, password, status: 'active' };
      upsertById<User>('users', updated);
      return stripPassword(updated);
    },
  };
}
```

- [ ] **Step 7: Wire services in `src/services/mock/index.ts`**

```ts
import type { Api } from '@/services/api';
import { seedDatabase } from './seed';
import { createAuthService } from './authService';
import { createPropertiesService } from './propertiesService';
import { createContractsService } from './contractsService';
import { createUsersService } from './usersService';

export function createMockApi(): Api {
  seedDatabase();
  return {
    auth: createAuthService(),
    properties: createPropertiesService(),
    contracts: createContractsService(),
    users: createUsersService(),
  };
}
```

- [ ] **Step 8: Run the new tests and typecheck**

Run: `npm run test:run -- src/services/mock` — all green.
Run: `npm run typecheck` — clean.

- [ ] **Step 9: Commit**

```bash
git add src/services
git commit -m "feat(m2): add properties/contracts/users mock services"
```

---

## Task 3: Query keys + TanStack Query hooks

**Files:**
- Create: `src/services/hooks/queryKeys.ts`
- Create: `src/services/hooks/properties.ts`
- Create: `src/services/hooks/contracts.ts`
- Create: `src/services/hooks/users.ts`
- Create: `src/services/hooks/hooks.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/services/hooks/hooks.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { seedDatabase } from '@/services/mock/seed';
import {
  useProperties, useProperty, useCreateProperty, useUpdateProperty, useDeleteProperty,
} from '@/services/hooks/properties';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('property query hooks', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('useProperties returns the seeded rows', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.length ?? 0).toBeGreaterThan(0));
  });

  it('useProperty returns a single row', async () => {
    const { result } = renderHook(() => useProperty('p-101'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.id).toBe('p-101'));
  });

  it('useCreateProperty invalidates the list', async () => {
    const w = wrapper();
    const list = renderHook(() => useProperties(), { wrapper: w });
    await waitFor(() => expect(list.result.current.data?.length ?? 0).toBeGreaterThan(0));
    const before = list.result.current.data!.length;
    const mut = renderHook(() => useCreateProperty(), { wrapper: w });
    await act(async () => {
      await mut.result.current.mutateAsync({
        name: 'New', address: 'Addr', roomType: 'studio',
        rent: 5000, status: 'vacant', buildingId: 'b-norra',
      });
    });
    await waitFor(() => expect(list.result.current.data?.length).toBe(before + 1));
  });

  it('useUpdateProperty and useDeleteProperty refresh the cache', async () => {
    const w = wrapper();
    const u = renderHook(() => useUpdateProperty(), { wrapper: w });
    await act(async () => {
      await u.result.current.mutateAsync({ id: 'p-101', patch: { rent: 9999 } });
    });
    const one = renderHook(() => useProperty('p-101'), { wrapper: w });
    await waitFor(() => expect(one.result.current.data?.rent).toBe(9999));

    const d = renderHook(() => useDeleteProperty(), { wrapper: w });
    await act(async () => {
      await d.result.current.mutateAsync('p-103');
    });
    const gone = renderHook(() => useProperty('p-103'), { wrapper: w });
    await waitFor(() => expect(gone.result.current.data).toBeUndefined());
  });
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm run test:run -- src/services/hooks/hooks`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/services/hooks/queryKeys.ts`**

```ts
/** Central key factory so invalidations stay in sync with reads. */
export const keys = {
  properties: () => ['properties'] as const,
  property: (id: string) => ['properties', id] as const,
  contractByProperty: (propertyId: string) => ['contracts', 'byProperty', propertyId] as const,
  users: () => ['users'] as const,
  user: (id: string) => ['users', id] as const,
};
```

- [ ] **Step 4: Write `src/services/hooks/properties.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Property } from '@/types';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useProperties() {
  return useQuery({ queryKey: keys.properties(), queryFn: () => api.properties.list() });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.property(id) : ['properties', 'none'],
    queryFn: () => api.properties.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Property, 'id'>) => api.properties.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.properties() }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Property, 'id'>> }) =>
      api.properties.update(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.properties() });
      qc.invalidateQueries({ queryKey: keys.property(row.id) });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.properties.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.properties() }),
  });
}
```

- [ ] **Step 5: Write `src/services/hooks/contracts.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useContractByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId ? keys.contractByProperty(propertyId) : ['contracts', 'none'],
    queryFn: () => api.contracts.byPropertyId(propertyId as string),
    enabled: Boolean(propertyId),
  });
}
```

- [ ] **Step 6: Write `src/services/hooks/users.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InviteInput } from '@/services/api';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useUsers() {
  return useQuery({ queryKey: keys.users(), queryFn: () => api.users.list() });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.user(id) : ['users', 'none'],
    queryFn: () => api.users.get(id as string),
    enabled: Boolean(id),
  });
}

export function useInviteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteInput) => api.users.invite(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.users() });
      qc.invalidateQueries({ queryKey: keys.properties() });
    },
  });
}

export function useSetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      api.users.setPassword(userId, password),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: keys.users() });
      qc.invalidateQueries({ queryKey: keys.user(u.id) });
    },
  });
}
```

- [ ] **Step 7: Tests + typecheck green**

Run: `npm run test:run -- src/services/hooks`
Expected: PASS (4 tests).

Run: `npm run typecheck` — clean.

- [ ] **Step 8: Commit**

```bash
git add src/services/hooks
git commit -m "feat(m2): add TanStack Query hooks for properties/contracts/users"
```

---

## Task 4: Shared `StatusChip` component

**Files:**
- Create: `src/components/StatusChip.tsx`
- Create: `src/components/StatusChip.test.tsx`

> Built once now; reused by maintenance (M3), economy (M5), and the move-out chip (M7).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorModeProvider } from '@/theme/ColorModeContext';
import { StatusChip } from '@/components/StatusChip';

function inTheme(node: React.ReactElement) {
  return render(<ColorModeProvider>{node}</ColorModeProvider>);
}

describe('StatusChip', () => {
  it('renders property statuses with translated labels', () => {
    inTheme(<StatusChip kind="property" value="vacant" />);
    expect(screen.getByText(/ledigt|vacant/i)).toBeInTheDocument();
  });

  it('renders maintenance statuses', () => {
    inTheme(<StatusChip kind="maintenance" value="in_progress" />);
    expect(screen.getByText(/pågår|in progress/i)).toBeInTheDocument();
  });

  it('renders invoice statuses', () => {
    inTheme(<StatusChip kind="invoice" value="overdue" />);
    expect(screen.getByText(/försenad|overdue/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npm run test:run -- src/components/StatusChip`
Expected: FAIL — module not found.

- [ ] **Step 3: Add translation keys**

In `src/i18n/locales/sv.json`, merge into the root object:

```json
"status": {
  "property": { "vacant": "Ledigt", "occupied": "Uthyrt" },
  "maintenance": { "received": "Mottagen", "in_progress": "Pågår", "resolved": "Löst" },
  "invoice": { "paid": "Betald", "unpaid": "Obetald", "overdue": "Försenad" }
}
```

In `src/i18n/locales/en.json`, mirror the structure:

```json
"status": {
  "property": { "vacant": "Vacant", "occupied": "Occupied" },
  "maintenance": { "received": "Received", "in_progress": "In progress", "resolved": "Resolved" },
  "invoice": { "paid": "Paid", "unpaid": "Unpaid", "overdue": "Overdue" }
}
```

- [ ] **Step 4: Write `src/components/StatusChip.tsx`**

```tsx
import Chip, { type ChipProps } from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import type {
  InvoiceStatus, MaintenanceStatus, PropertyStatus,
} from '@/types';

type Kind = 'property' | 'maintenance' | 'invoice';

type ValueFor<K extends Kind> =
  K extends 'property' ? PropertyStatus :
  K extends 'maintenance' ? MaintenanceStatus :
  InvoiceStatus;

type StatusChipProps<K extends Kind> = {
  kind: K;
  value: ValueFor<K>;
  size?: ChipProps['size'];
};

const colors: Record<Kind, Record<string, ChipProps['color']>> = {
  property: { vacant: 'default', occupied: 'success' },
  maintenance: { received: 'info', in_progress: 'warning', resolved: 'success' },
  invoice: { paid: 'success', unpaid: 'warning', overdue: 'error' },
};

export function StatusChip<K extends Kind>({ kind, value, size = 'small' }: StatusChipProps<K>) {
  const { t } = useTranslation();
  return (
    <Chip
      size={size}
      color={colors[kind][value] ?? 'default'}
      label={t(`status.${kind}.${value}`)}
    />
  );
}
```

- [ ] **Step 5: Tests + typecheck green**

Run: `npm run test:run -- src/components/StatusChip src/i18n`
Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/components/StatusChip.tsx src/components/StatusChip.test.tsx src/i18n
git commit -m "feat(m2): add shared StatusChip with semantic colors and i18n labels"
```

---

## Task 5: Admin layout shell (AppBar + Drawer + actions)

**Files:**
- Create: `src/components/AppBarActions.tsx`
- Create: `src/components/AdminLayout.tsx`
- Modify: `src/i18n/locales/sv.json` (nav extension)
- Modify: `src/i18n/locales/en.json` (nav extension)

> No dedicated test; exercised by route tests in Tasks 6/9/12. Keep it dumb: presentation only.

- [ ] **Step 1: Extend i18n nav strings**

Add to `nav` in both locales:

`sv.json` `nav`: `{ "admin": "Adminpanel", "home": "Hem", "properties": "Bostäder", "dashboard": "Översikt" }`
`en.json` `nav`: `{ "admin": "Admin panel", "home": "Home", "properties": "Properties", "dashboard": "Overview" }`

- [ ] **Step 2: Write `src/components/AppBarActions.tsx`**

```tsx
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';
import { useColorMode } from '@/theme/ColorModeContext';
import { useAuth } from '@/auth/AuthContext';

export function AppBarActions() {
  const { mode, toggle } = useColorMode();
  const { i18n, t } = useTranslation();
  const { logout } = useAuth();

  return (
    <>
      <Tooltip title={t('common.theme')}>
        <IconButton color="inherit" onClick={toggle} aria-label={t('common.theme')}>
          {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Tooltip>
      <Tooltip title={t('common.language')}>
        <IconButton
          color="inherit"
          onClick={() => i18n.changeLanguage(i18n.language === 'sv' ? 'en' : 'sv')}
          aria-label={t('common.language')}
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('common.logout')}>
        <IconButton color="inherit" onClick={logout} aria-label={t('common.logout')}>
          <LogoutIcon />
        </IconButton>
      </Tooltip>
    </>
  );
}
```

- [ ] **Step 3: Write `src/components/AdminLayout.tsx`**

```tsx
import { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { AppBarActions } from './AppBarActions';

const DRAWER_WIDTH = 240;

export function AdminLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const items = useMemo(
    () => [
      { to: '/admin', icon: <DashboardIcon />, label: t('nav.dashboard') },
      { to: '/admin/properties', icon: <ApartmentIcon />, label: t('nav.properties') },
    ],
    [t],
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('nav.admin')}
          </Typography>
          <AppBarActions />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {items.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={pathname === item.to ||
                (item.to !== '/admin' && pathname.startsWith(item.to))}
              end={item.to === '/admin'}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminLayout.tsx src/components/AppBarActions.tsx src/i18n
git commit -m "feat(m2): add admin layout shell with permanent drawer and topbar actions"
```

---

## Task 6: Properties list (DataGrid + search + status filter)

**Files:**
- Create: `src/features/properties/PropertiesPage.tsx`
- Create: `src/features/properties/PropertiesPage.test.tsx`
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json` (properties section)

- [ ] **Step 1: Add i18n keys**

Insert at the root of both locales:

`sv.json`:
```json
"properties": {
  "title": "Bostäder",
  "search": "Sök",
  "statusFilter": "Status",
  "all": "Alla",
  "name": "Namn",
  "address": "Adress",
  "roomType": "Typ",
  "rent": "Hyra",
  "status": "Status",
  "actions": "Åtgärder",
  "new": "Ny bostad",
  "loadError": "Kunde inte ladda bostäder",
  "empty": "Inga bostäder"
}
```

`en.json`:
```json
"properties": {
  "title": "Properties",
  "search": "Search",
  "statusFilter": "Status",
  "all": "All",
  "name": "Name",
  "address": "Address",
  "roomType": "Type",
  "rent": "Rent",
  "status": "Status",
  "actions": "Actions",
  "new": "New property",
  "loadError": "Could not load properties",
  "empty": "No properties"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/admin/properties" element={<PropertiesPage />} />
    </Routes>
  );
}

describe('PropertiesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('renders the seeded rows', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    expect(screen.getByText('Studio 104')).toBeInTheDocument();
  });

  it('filters by search term', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/sök/i), 'Studio');
    await waitFor(() => expect(screen.queryByText('Rum 101')).not.toBeInTheDocument());
    expect(screen.getByText('Studio 104')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/^status$/i));
    await userEvent.click(screen.getByRole('option', { name: /uthyrt/i }));
    await waitFor(() => expect(screen.queryByText('Rum 103')).not.toBeInTheDocument());
    expect(screen.getByText('Rum 101')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to confirm fail**

Run: `npm run test:run -- src/features/properties/PropertiesPage`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `src/features/properties/PropertiesPage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Property, PropertyStatus } from '@/types';
import { useProperties } from '@/services/hooks/properties';
import { StatusChip } from '@/components/StatusChip';
import { PropertyFormDialog } from './PropertyFormDialog';

type StatusFilter = 'all' | PropertyStatus;

export function PropertiesPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useProperties();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [creating, setCreating] = useState(false);

  const rows = useMemo<Property[]>(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (!term) return true;
      return (
        row.name.toLowerCase().includes(term) ||
        row.address.toLowerCase().includes(term) ||
        row.roomType.toLowerCase().includes(term)
      );
    });
  }, [data, search, status]);

  const columns = useMemo<GridColDef<Property>[]>(
    () => [
      { field: 'name', headerName: t('properties.name'), flex: 1 },
      { field: 'address', headerName: t('properties.address'), flex: 1 },
      { field: 'roomType', headerName: t('properties.roomType'), flex: 1 },
      {
        field: 'rent',
        headerName: t('properties.rent'),
        width: 120,
        valueFormatter: (value: number) => `${value} kr`,
      },
      {
        field: 'status',
        headerName: t('properties.status'),
        width: 140,
        renderCell: (params) => <StatusChip kind="property" value={params.row.status} />,
      },
      {
        field: 'actions',
        headerName: t('properties.actions'),
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton
            component={RouterLink}
            to={`/admin/properties/${params.row.id}`}
            aria-label={t('properties.actions')}
            size="small"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [t],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('properties.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          {t('properties.new')}
        </Button>
      </Stack>

      <Stack direction="row" sx={{ mb: 2, gap: 2 }}>
        <TextField
          label={t('properties.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label={t('properties.statusFilter')}
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          sx={{ width: 220 }}
        >
          <MenuItem value="all">{t('properties.all')}</MenuItem>
          <MenuItem value="vacant">{t('status.property.vacant')}</MenuItem>
          <MenuItem value="occupied">{t('status.property.occupied')}</MenuItem>
        </TextField>
      </Stack>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>{t('properties.loadError')}</Alert>}
      {isLoading && <Skeleton variant="rectangular" height={400} />}

      {!isLoading && (
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          localeText={rows.length === 0 ? { noRowsLabel: t('properties.empty') } : undefined}
        />
      )}

      <PropertyFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
      />
    </Box>
  );
}
```

- [ ] **Step 5: Verify**

The test will fail until Task 8 ships `PropertyFormDialog`. To unblock it now, create a stub:

`src/features/properties/PropertyFormDialog.tsx`:

```tsx
interface PropertyFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  propertyId?: string;
}

export function PropertyFormDialog(_props: PropertyFormDialogProps) {
  return null;
}
```

(The full implementation lands in Task 8.)

Run: `npm run test:run -- src/features/properties/PropertiesPage`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/properties/PropertiesPage.tsx src/features/properties/PropertiesPage.test.tsx src/features/properties/PropertyFormDialog.tsx src/i18n
git commit -m "feat(m2): add properties DataGrid page with search and status filter"
```

---

## Task 7: Property detail page

**Files:**
- Create: `src/features/properties/PropertyDetailPage.tsx`
- Create: `src/features/properties/PropertyDetailPage.test.tsx`
- Create: `src/features/properties/InviteResidentDialog.tsx` (stub for now; real impl in Task 9)
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json` (detail section)

- [ ] **Step 1: Add i18n keys**

`sv.json` root:
```json
"propertyDetail": {
  "back": "Tillbaka",
  "edit": "Redigera",
  "invite": "Bjud in boende",
  "info": "Information",
  "resident": "Boende",
  "contract": "Kontrakt",
  "maintenance": "Felanmälningar",
  "noResident": "Ingen boende",
  "noContract": "Inget kontrakt",
  "maintenancePlaceholder": "Felanmälningar visas i nästa milstolpe",
  "notFound": "Bostaden kunde inte hittas",
  "contractRent": "Hyra",
  "contractStart": "Startdatum",
  "contractTerms": "Villkor"
}
```

`en.json` root:
```json
"propertyDetail": {
  "back": "Back",
  "edit": "Edit",
  "invite": "Invite resident",
  "info": "Information",
  "resident": "Resident",
  "contract": "Contract",
  "maintenance": "Maintenance",
  "noResident": "No resident",
  "noContract": "No contract",
  "maintenancePlaceholder": "Maintenance history arrives in the next milestone",
  "notFound": "Property not found",
  "contractRent": "Rent",
  "contractStart": "Start date",
  "contractTerms": "Terms"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/admin/properties/:id" element={<PropertyDetailPage />} />
      <Route path="/admin/properties" element={<div>LIST</div>} />
    </Routes>
  );
}

describe('PropertyDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('renders the property info and the current resident', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/p-101' });
    await waitFor(() => expect(screen.getByRole('heading', { name: /rum 101/i })).toBeInTheDocument());
    expect(screen.getByText(/rasmus resident/i)).toBeInTheDocument();
    expect(screen.getByText(/standardvillkor/i)).toBeInTheDocument();
  });

  it('renders "no resident" / "no contract" for a vacant property', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/p-103' });
    await waitFor(() => expect(screen.getByRole('heading', { name: /rum 103/i })).toBeInTheDocument());
    expect(screen.getByText(/ingen boende/i)).toBeInTheDocument();
    expect(screen.getByText(/inget kontrakt/i)).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown id', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/does-not-exist' });
    await waitFor(() =>
      expect(screen.getByText(/kunde inte hittas/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 3: Run to fail**

Run: `npm run test:run -- src/features/properties/PropertyDetailPage`
Expected: FAIL — module not found.

- [ ] **Step 4: Stub `InviteResidentDialog`**

`src/features/properties/InviteResidentDialog.tsx`:

```tsx
interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
}

export function InviteResidentDialog(_props: Props) {
  return null;
}
```

- [ ] **Step 5: Write `src/features/properties/PropertyDetailPage.tsx`**

```tsx
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { StatusChip } from '@/components/StatusChip';
import { useProperty } from '@/services/hooks/properties';
import { useContractByProperty } from '@/services/hooks/contracts';
import { useUser } from '@/services/hooks/users';
import { PropertyFormDialog } from './PropertyFormDialog';
import { InviteResidentDialog } from './InviteResidentDialog';

export function PropertyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const property = useProperty(id);
  const contract = useContractByProperty(id);
  const resident = useUser(property.data?.residentId);

  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);

  if (property.isLoading) return <Skeleton variant="rectangular" height={300} />;
  if (!property.data) {
    return (
      <Stack sx={{ gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/admin/properties">
          {t('propertyDetail.back')}
        </Button>
        <Alert severity="warning">{t('propertyDetail.notFound')}</Alert>
      </Stack>
    );
  }

  const p = property.data;

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/admin/properties">
          {t('propertyDetail.back')}
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{p.name}</Typography>
        <StatusChip kind="property" value={p.status} />
        <Button startIcon={<EditIcon />} onClick={() => setEditing(true)}>
          {t('propertyDetail.edit')}
        </Button>
        {p.status === 'vacant' && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviting(true)}
          >
            {t('propertyDetail.invite')}
          </Button>
        )}
      </Stack>

      <Stack sx={{ gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.info')}</Typography>
            <Typography>{p.address}</Typography>
            <Typography>{p.roomType}</Typography>
            <Typography>{p.rent} kr</Typography>
            {p.description && <Typography sx={{ mt: 1 }}>{p.description}</Typography>}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.resident')}</Typography>
            {resident.data ? (
              <Stack>
                <Typography>{resident.data.name}</Typography>
                <Typography variant="body2" color="text.secondary">{resident.data.email}</Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">{t('propertyDetail.noResident')}</Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.contract')}</Typography>
            {contract.data ? (
              <Stack>
                <Typography>{t('propertyDetail.contractRent')}: {contract.data.rent} kr</Typography>
                <Typography>{t('propertyDetail.contractStart')}: {contract.data.startDate}</Typography>
                <Typography>{t('propertyDetail.contractTerms')}: {contract.data.terms}</Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">{t('propertyDetail.noContract')}</Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.maintenance')}</Typography>
            <Typography color="text.secondary">{t('propertyDetail.maintenancePlaceholder')}</Typography>
          </CardContent>
        </Card>
      </Stack>

      <PropertyFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        mode="edit"
        propertyId={p.id}
      />
      <InviteResidentDialog
        open={inviting}
        onClose={() => setInviting(false)}
        propertyId={p.id}
      />
    </Box>
  );
}
```

- [ ] **Step 6: Tests + typecheck green**

Run: `npm run test:run -- src/features/properties/PropertyDetailPage`
Run: `npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add src/features/properties src/i18n
git commit -m "feat(m2): add property detail page with resident and contract cards"
```

---

## Task 8: Property create/edit form Dialog

**Files:**
- Modify: `src/features/properties/PropertyFormDialog.tsx`
- Create: `src/features/properties/PropertyFormDialog.test.tsx`
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json`

- [ ] **Step 1: Add i18n keys**

Append to `properties` in both locales (under the existing `properties` block from Task 6):

`sv.json` add inside `properties`:
```json
"form": {
  "createTitle": "Ny bostad",
  "editTitle": "Redigera bostad",
  "building": "Hus",
  "name": "Namn",
  "address": "Adress",
  "roomType": "Typ",
  "rent": "Hyra",
  "description": "Beskrivning",
  "save": "Spara",
  "cancel": "Avbryt",
  "required": "Obligatoriskt"
}
```

`en.json` add inside `properties`:
```json
"form": {
  "createTitle": "New property",
  "editTitle": "Edit property",
  "building": "Building",
  "name": "Name",
  "address": "Address",
  "roomType": "Type",
  "rent": "Rent",
  "description": "Description",
  "save": "Save",
  "cancel": "Cancel",
  "required": "Required"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/admin/properties" element={<PropertiesPage />} />
    </Routes>
  );
}

describe('PropertyFormDialog (via list page)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('creates a new property and shows it in the grid', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /ny bostad/i }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(dialog.querySelector('input[name="name"]')!, 'Rum 999');
    await userEvent.type(dialog.querySelector('input[name="address"]')!, 'Testväg 9');
    await userEvent.type(dialog.querySelector('input[name="roomType"]')!, 'studio');
    await userEvent.type(dialog.querySelector('input[name="rent"]')!, '7000');
    await userEvent.click(screen.getByRole('button', { name: /^spara$/i }));

    await waitFor(() => expect(screen.getByText('Rum 999')).toBeInTheDocument());
  });

  it('shows validation when required fields are missing', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /ny bostad/i }));
    await userEvent.click(screen.getByRole('button', { name: /^spara$/i }));
    // dialog stays open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to fail**

Run: `npm run test:run -- src/features/properties/PropertyFormDialog`
Expected: FAIL — dialog doesn't render any inputs.

- [ ] **Step 4: Write `src/features/properties/PropertyFormDialog.tsx`** (replaces the stub)

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import type { Property } from '@/types';
import { useCreateProperty, useProperty, useUpdateProperty } from '@/services/hooks/properties';
import { readCollection } from '@/services/mock/storage';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  propertyId?: string;
}

const schema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  roomType: z.string().min(1),
  rent: z.coerce.number().int().nonnegative(),
  buildingId: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['vacant', 'occupied']),
});
type FormValues = z.infer<typeof schema>;

export function PropertyFormDialog({ open, onClose, mode, propertyId }: Props) {
  const { t } = useTranslation();
  const create = useCreateProperty();
  const update = useUpdateProperty();
  const existing = useProperty(mode === 'edit' ? propertyId : undefined);

  // Buildings read directly — there is no useBuildings hook in M2 (added in M6 if needed)
  const buildings = readCollection<{ id: string; name: string }>('buildings', []);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: '', address: '', roomType: '', rent: 0,
        buildingId: buildings[0]?.id ?? '',
        description: '', status: 'vacant',
      },
    });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && existing.data) {
      reset({
        name: existing.data.name,
        address: existing.data.address,
        roomType: existing.data.roomType,
        rent: existing.data.rent,
        buildingId: existing.data.buildingId,
        description: existing.data.description ?? '',
        status: existing.data.status,
      });
    }
    if (mode === 'create') {
      reset({
        name: '', address: '', roomType: '', rent: 0,
        buildingId: buildings[0]?.id ?? '',
        description: '', status: 'vacant',
      });
    }
  }, [open, mode, existing.data, reset, buildings]);

  const submit = handleSubmit(async (values) => {
    const payload: Omit<Property, 'id'> = {
      name: values.name,
      address: values.address,
      roomType: values.roomType,
      rent: values.rent,
      buildingId: values.buildingId,
      description: values.description || undefined,
      status: values.status,
    };
    if (mode === 'create') {
      await create.mutateAsync(payload);
    } else if (propertyId) {
      await update.mutateAsync({ id: propertyId, patch: payload });
    }
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === 'create' ? t('properties.form.createTitle') : t('properties.form.editTitle')}
      </DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <TextField
              label={t('properties.form.name')}
              error={Boolean(errors.name)}
              helperText={errors.name && t('properties.form.required')}
              {...register('name')}
            />
            <TextField
              label={t('properties.form.address')}
              error={Boolean(errors.address)}
              helperText={errors.address && t('properties.form.required')}
              {...register('address')}
            />
            <TextField
              label={t('properties.form.roomType')}
              error={Boolean(errors.roomType)}
              helperText={errors.roomType && t('properties.form.required')}
              {...register('roomType')}
            />
            <TextField
              label={t('properties.form.rent')}
              type="number"
              inputProps={{ min: 0 }}
              error={Boolean(errors.rent)}
              helperText={errors.rent && t('properties.form.required')}
              {...register('rent')}
            />
            <TextField
              select
              label={t('properties.form.building')}
              defaultValue={buildings[0]?.id ?? ''}
              {...register('buildingId')}
            >
              {buildings.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('properties.form.description')}
              multiline
              minRows={2}
              {...register('description')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('properties.form.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t('properties.form.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 5: Verify all property tests pass**

Run: `npm run test:run -- src/features/properties`
Expected: PASS (PropertiesPage 3 + PropertyDetailPage 3 + PropertyFormDialog 2 = 8).

Run: `npm run typecheck` — clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/properties/PropertyFormDialog.tsx src/features/properties/PropertyFormDialog.test.tsx src/i18n
git commit -m "feat(m2): add property create/edit dialog with zod-validated form"
```

---

## Task 9: Invite resident Dialog + temp-password reveal

**Files:**
- Modify: `src/features/properties/InviteResidentDialog.tsx`
- Create: `src/features/properties/InviteResidentDialog.test.tsx`
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json`

- [ ] **Step 1: Add i18n keys**

`sv.json` root:
```json
"invite": {
  "title": "Bjud in boende",
  "name": "Namn",
  "email": "E-post",
  "send": "Skicka inbjudan",
  "cancel": "Avbryt",
  "successTitle": "Inbjudan skapad",
  "tempPasswordHint": "Tillfälligt lösenord — dela med den boende",
  "username": "Användarnamn",
  "done": "Klart",
  "required": "Obligatoriskt"
}
```

`en.json` root:
```json
"invite": {
  "title": "Invite resident",
  "name": "Name",
  "email": "Email",
  "send": "Send invite",
  "cancel": "Cancel",
  "successTitle": "Invite created",
  "tempPasswordHint": "Temporary password — share with the resident",
  "username": "Username",
  "done": "Done",
  "required": "Required"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/admin/properties/:id" element={<PropertyDetailPage />} />
    </Routes>
  );
}

describe('InviteResidentDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('creates a pending resident, marks the property occupied, and reveals the temp password', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/p-103' });
    await waitFor(() => expect(screen.getByRole('heading', { name: /rum 103/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /bjud in boende/i }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(dialog.querySelector('input[name="name"]')!, 'Nora New');
    await userEvent.type(dialog.querySelector('input[name="email"]')!, 'nora@student.se');
    await userEvent.click(screen.getByRole('button', { name: /skicka inbjudan/i }));

    await waitFor(() =>
      expect(screen.getByText(/inbjudan skapad/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/temp-/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /klart/i }));

    // page now shows the new resident and occupied status
    await waitFor(() => expect(screen.getByText(/nora new/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run to fail**

Run: `npm run test:run -- src/features/properties/InviteResidentDialog`
Expected: FAIL.

- [ ] **Step 4: Write `src/features/properties/InviteResidentDialog.tsx`** (replaces stub)

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useInviteResident } from '@/services/hooks/users';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
}

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
type FormValues = z.infer<typeof schema>;

interface RevealedInvite {
  tempPassword: string;
  username: string;
}

export function InviteResidentDialog({ open, onClose, propertyId }: Props) {
  const { t } = useTranslation();
  const invite = useInviteResident();
  const [revealed, setRevealed] = useState<RevealedInvite | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { name: '', email: '' },
    });

  function handleClose() {
    setRevealed(null);
    reset();
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    const result = await invite.mutateAsync({ ...values, propertyId });
    setRevealed({ tempPassword: result.tempPassword, username: result.user.username });
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {revealed ? t('invite.successTitle') : t('invite.title')}
      </DialogTitle>
      {revealed ? (
        <>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              <Alert severity="info">{t('invite.tempPasswordHint')}</Alert>
              <Typography>
                {t('invite.username')}: <code>{revealed.username}</code>
              </Typography>
              <Typography>
                <code>{revealed.tempPassword}</code>
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleClose}>{t('invite.done')}</Button>
          </DialogActions>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              <TextField
                label={t('invite.name')}
                error={Boolean(errors.name)}
                helperText={errors.name && t('invite.required')}
                {...register('name')}
              />
              <TextField
                label={t('invite.email')}
                type="email"
                error={Boolean(errors.email)}
                helperText={errors.email && t('invite.required')}
                {...register('email')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>{t('invite.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {t('invite.send')}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 5: Tests + typecheck green**

Run: `npm run test:run -- src/features/properties`
Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/features/properties/InviteResidentDialog.tsx src/features/properties/InviteResidentDialog.test.tsx src/i18n
git commit -m "feat(m2): add invite-resident dialog with temp password reveal"
```

---

## Task 10: Dashboard with summary cards

**Files:**
- Modify: `src/features/dashboard/AdminDashboard.tsx` (replace placeholder)
- Create: `src/features/dashboard/AdminDashboard.test.tsx`
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json`

> M2 fills the three property-derived cards. Maintenance / unpaid rent / move-out cards render zeros now and are wired in M3/M5/M7.

- [ ] **Step 1: Add i18n keys**

`sv.json` root:
```json
"dashboard": {
  "title": "Översikt",
  "properties": "Bostäder",
  "occupancy": "Beläggning",
  "vacancies": "Lediga",
  "openMaintenance": "Öppna ärenden",
  "unpaidRent": "Obetalda hyror",
  "upcomingMoveOuts": "Kommande utflyttningar"
}
```

`en.json` root:
```json
"dashboard": {
  "title": "Overview",
  "properties": "Properties",
  "occupancy": "Occupancy",
  "vacancies": "Vacancies",
  "openMaintenance": "Open requests",
  "unpaidRent": "Unpaid rent",
  "upcomingMoveOuts": "Upcoming move-outs"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('shows the property count and occupancy from seeded data', async () => {
    renderWithProviders(<AdminDashboard />, { route: '/admin' });
    await waitFor(() => {
      // 8 seeded properties; 2 occupied → 25% occupancy; 6 vacancies
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Run to fail**

Run: `npm run test:run -- src/features/dashboard/AdminDashboard`
Expected: FAIL — dashboard still says "Adminpanel".

- [ ] **Step 4: Rewrite `src/features/dashboard/AdminDashboard.tsx`**

```tsx
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useProperties } from '@/services/hooks/properties';

interface CardSpec {
  label: string;
  value: string | number;
  to?: string;
}

function StatCard({ spec, loading }: { spec: CardSpec; loading: boolean }) {
  const body = (
    <CardContent>
      <Typography variant="overline" color="text.secondary">{spec.label}</Typography>
      <Typography variant="h3" sx={{ mt: 1 }}>
        {loading ? <Skeleton width={80} /> : spec.value}
      </Typography>
    </CardContent>
  );
  return (
    <Card>
      {spec.to ? <CardActionArea component={RouterLink} to={spec.to}>{body}</CardActionArea> : body}
    </Card>
  );
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const properties = useProperties();
  const total = properties.data?.length ?? 0;
  const occupied = properties.data?.filter((p) => p.status === 'occupied').length ?? 0;
  const occupancyPct = total === 0 ? 0 : Math.round((occupied / total) * 100);
  const vacancies = total - occupied;

  const cards: CardSpec[] = [
    { label: t('dashboard.properties'), value: total, to: '/admin/properties' },
    { label: t('dashboard.occupancy'), value: `${occupancyPct}%`, to: '/admin/properties' },
    { label: t('dashboard.vacancies'), value: vacancies, to: '/admin/properties' },
    { label: t('dashboard.openMaintenance'), value: 0 },
    { label: t('dashboard.unpaidRent'), value: 0 },
    { label: t('dashboard.upcomingMoveOuts'), value: 0 },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('dashboard.title')}</Typography>
      <Grid container spacing={2}>
        {cards.map((spec) => (
          <Grid key={spec.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard spec={spec} loading={properties.isLoading} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run test:run -- src/features/dashboard`
Run: `npm run typecheck` — clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard src/i18n
git commit -m "feat(m2): replace placeholder admin dashboard with summary cards"
```

---

## Task 11: Onboarding page + guard + auth flow

**Files:**
- Modify: `src/auth/paths.ts`
- Modify: `src/auth/guards.tsx`
- Modify: `src/auth/AuthContext.tsx`
- Modify: `src/features/auth/LoginPage.tsx`
- Create: `src/features/auth/OnboardingPage.tsx`
- Create: `src/features/auth/OnboardingPage.test.tsx`
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json`

- [ ] **Step 1: Add i18n keys**

`sv.json` root:
```json
"onboarding": {
  "title": "Välkommen — välj ditt lösenord",
  "password": "Nytt lösenord",
  "confirm": "Bekräfta lösenord",
  "submit": "Spara och fortsätt",
  "mismatch": "Lösenorden matchar inte",
  "tooShort": "Minst 8 tecken"
}
```

`en.json` root:
```json
"onboarding": {
  "title": "Welcome — set your password",
  "password": "New password",
  "confirm": "Confirm password",
  "submit": "Save and continue",
  "mismatch": "Passwords don't match",
  "tooShort": "At least 8 characters"
}
```

- [ ] **Step 2: Update `src/auth/paths.ts`**

```ts
import type { Role, UserStatus } from '@/types';

/** The landing route for an authenticated user. Pending residents go to onboarding. */
export function homePathFor(role: Role, status: UserStatus = 'active'): string {
  if (role === 'resident' && status === 'pending') return '/onboarding';
  return role === 'resident' ? '/home' : '/admin';
}
```

- [ ] **Step 3: Add `RequirePending` and update existing guards**

Rewrite `src/auth/guards.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/types';
import { useAuth } from './AuthContext';
import { homePathFor } from './paths';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'resident' && user.status === 'pending') {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'resident' && user.status === 'pending') {
    return <Navigate to="/onboarding" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role, user.status)} replace />;
  }
  return <>{children}</>;
}

/** Only pending residents may stay; everyone else gets sent to their home. */
export function RequirePending({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'resident' || user.status !== 'pending') {
    return <Navigate to={homePathFor(user.role, user.status)} replace />;
  }
  return <>{children}</>;
}

export function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user.role, user.status) : '/login'} replace />;
}
```

- [ ] **Step 4: Update `AuthContext` to expose session refresh**

In `src/auth/AuthContext.tsx`, replace the `AuthContextValue` interface + factory to add a `refreshUser` method that pulls the latest user from `api.users.get(...)`:

Insert near the bottom of the `useMemo` value:

```ts
async function refreshUser() {
  const current = userRef;
  if (!current) return;
  const fresh = await api.users.get(current.id);
  if (fresh) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
    setUser(fresh);
  }
}
```

Replace `src/auth/AuthContext.tsx` with:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SafeUser } from '@/types';
import { api } from '@/services';
import { STORAGE_PREFIX } from '@/config/constants';

const SESSION_KEY = `${STORAGE_PREFIX}session`;

interface AuthContextValue {
  user: SafeUser | null;
  login: (username: string, password: string) => Promise<SafeUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function restore(): SafeUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SafeUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(restore);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      async login(username, password) {
        const u = await api.auth.login(username, password);
        localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
        return u;
      },
      logout() {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      },
      async refreshUser() {
        if (!user) return;
        const fresh = await api.users.get(user.id);
        if (fresh) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
          setUser(fresh);
        }
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Update `LoginPage.tsx` to honor `status` on redirect**

Change the navigate call:

```ts
navigate(homePathFor(user.role, user.status), { replace: true });
```

(That's the only change in `LoginPage.tsx`.)

- [ ] **Step 6: Write the failing onboarding test**

`src/features/auth/OnboardingPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { OnboardingPage } from '@/features/auth/OnboardingPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/home" element={<div>RESIDENT HOME</div>} />
    </Routes>
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    // logged-in pending resident
    localStorage.setItem('studhem.v1.session', JSON.stringify({
      id: 'u-pending', name: 'Pia Pending', email: 'pia@student.se', username: 'pending',
      role: 'resident', status: 'pending',
    }));
  });

  it('rejects mismatched passwords', async () => {
    renderWithProviders(<Tree />, { route: '/onboarding' });
    await userEvent.type(screen.getByLabelText(/nytt lösenord/i), 'password1');
    await userEvent.type(screen.getByLabelText(/bekräfta lösenord/i), 'different1');
    await userEvent.click(screen.getByRole('button', { name: /spara och fortsätt/i }));
    expect(await screen.findByText(/lösenorden matchar inte/i)).toBeInTheDocument();
  });

  it('saves the password, flips status to active, and routes to /home', async () => {
    renderWithProviders(<Tree />, { route: '/onboarding' });
    await userEvent.type(screen.getByLabelText(/nytt lösenord/i), 'password1');
    await userEvent.type(screen.getByLabelText(/bekräfta lösenord/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /spara och fortsätt/i }));
    await waitFor(() => expect(screen.getByText('RESIDENT HOME')).toBeInTheDocument());
  });
});
```

- [ ] **Step 7: Run to fail**

Run: `npm run test:run -- src/features/auth/OnboardingPage`
Expected: FAIL — module not found.

- [ ] **Step 8: Write `src/features/auth/OnboardingPage.tsx`**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/auth/AuthContext';
import { useSetUserPassword } from '@/services/hooks/users';
import { homePathFor } from '@/auth/paths';

const schema = z
  .object({
    password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' });

type FormValues = z.infer<typeof schema>;

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const setPassword = useSetUserPassword();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { password: '', confirm: '' },
    });

  const submit = handleSubmit(async ({ password }) => {
    if (!user) return;
    await setPassword.mutateAsync({ userId: user.id, password });
    await refreshUser();
    navigate(homePathFor('resident', 'active'), { replace: true });
  });

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 3 }}>{t('onboarding.title')}</Typography>
          <form onSubmit={submit} noValidate>
            <Stack sx={{ gap: 2 }}>
              <TextField
                label={t('onboarding.password')}
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.password)}
                helperText={errors.password && t('onboarding.tooShort')}
                {...register('password')}
              />
              <TextField
                label={t('onboarding.confirm')}
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.confirm)}
                helperText={errors.confirm && (errors.confirm.message === 'mismatch'
                  ? t('onboarding.mismatch')
                  : t('onboarding.tooShort'))}
                {...register('confirm')}
              />
              {errors.confirm?.message === 'mismatch' && (
                <Alert severity="error">{t('onboarding.mismatch')}</Alert>
              )}
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {t('onboarding.submit')}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 9: Tests + typecheck green**

Run: `npm run test:run`
Run: `npm run typecheck`

- [ ] **Step 10: Commit**

```bash
git add src/auth src/features/auth/LoginPage.tsx src/features/auth/OnboardingPage.tsx src/features/auth/OnboardingPage.test.tsx src/i18n
git commit -m "feat(m2): add /onboarding flow for pending residents"
```

---

## Task 12: Wire routes for nested admin + onboarding

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/app/routes.test.tsx`

- [ ] **Step 1: Update the route test**

Replace `src/app/routes.test.tsx` with:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from '@/app/routes';
import { seedDatabase } from '@/services/mock/seed';

describe('AppRoutes', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('redirects an unknown route to /login when logged out', async () => {
    renderWithProviders(<AppRoutes />, { route: '/totally-unknown' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /logga in/i })).toBeInTheDocument(),
    );
  });

  it('lands an admin on the admin dashboard at /admin', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/admin' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /översikt/i })).toBeInTheDocument(),
    );
  });

  it('renders the properties page at /admin/properties', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
  });

  it('routes a pending resident to /onboarding regardless of target', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-pending', username: 'pending', role: 'resident', name: 'P', email: 'p@p.se', status: 'pending' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/home' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /välkommen/i })).toBeInTheDocument(),
    );
  });

  it('lands a resident on resident home', () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/home' });
    expect(screen.getByText(/^hem$/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npm run test:run -- src/app/routes`
Expected: FAIL (some new routes don't exist yet).

- [ ] **Step 3: Rewrite `src/app/routes.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { OnboardingPage } from '@/features/auth/OnboardingPage';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { AdminLayout } from '@/components/AdminLayout';
import { RequirePending, RequireRole, RootRedirect } from '@/auth/guards';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={<RequirePending><OnboardingPage /></RequirePending>}
      />
      <Route
        path="/admin"
        element={<RequireRole roles={['admin', 'staff']}><AdminLayout /></RequireRole>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
      </Route>
      <Route
        path="/home"
        element={<RequireRole roles={['resident']}><ResidentHome /></RequireRole>}
      />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Run all tests**

Run: `npm run test:run`
Expected: full suite green.

Run: `npm run typecheck` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/app
git commit -m "feat(m2): wire nested /admin routes through AdminLayout and add /onboarding"
```

---

## Task 13: Milestone verification & gate

- [ ] **Step 1: Full test suite green**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 2: Typecheck clean**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Production build succeeds**

Run: `npm run build`
Expected: build completes, emits `dist/`.

- [ ] **Step 4: Manual dev-server smoke**

Run `npm run dev` and verify with the browser console open (no errors):
- Log in as `admin` / `admin123` → AdminLayout with AppBar + Drawer; dashboard shows live counts (8 / 25% / 6 from seed).
- Drawer "Bostäder" → DataGrid; search "Studio" hides corridor rooms; status filter "Uthyrt" hides vacant rows.
- Click the open-icon on a row → property detail; resident + contract cards render for occupied rooms, "no resident / no contract" for vacant.
- On a vacant property, click **Bjud in boende** → submit a name/email → temp password reveal; close → page shows new resident, status occupied.
- Click **Redigera** on a property; change rent; save; the list reflects the new value.
- Log out → /login. Log in as the **pending** user (`pending` / `temp-xyz`); land on `/onboarding`; set password (≥8 chars, matching); land on `/home`.
- Theme + language toggles in AppBar still persist across reload.

Stop the dev server when done.

- [ ] **Step 5: Acceptance check against spec**

Confirm M2 acceptance (base spec §10 + design doc §5 milestone 2):
- Admin can create, edit, search, and filter properties, and assign a resident (invite flow).
- Dashboard surfaces property/occupancy/vacancy counts.
- Onboarding routes `pending` residents through `/onboarding` to set their password.
- All strings live in i18n; spacing/colors come from theme.

- [ ] **Step 6: Final milestone commit (if needed)**

```bash
git add -A
git commit -m "chore(m2): milestone 2 (admin properties) complete"
```

---

## Definition of done (Milestone 2)

- `npm run test:run`, `npm run typecheck`, `npm run build` all green.
- Admin can list, search, filter, view, create, edit, and (via invite) assign residents to properties.
- Dashboard summary cards reflect live seed data.
- Pending residents are routed through `/onboarding` and emerge as `active` on `/home`.
- Cross-role guards still hold; theme + i18n still persist.
- New shared components (`StatusChip`, `AdminLayout`) reused by later milestones.
