# Student Housing App — Milestone 3 (Maintenance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let residents submit maintenance requests (with photo upload) and track them; let admin/staff triage them in an inbox with status updates, assignment, and visible history. Wire the live count into the dashboard and the request list onto the property detail page.

**Architecture:** Add `maintenance` to the mock `Api` (CRUD + `updateStatus` that appends to `history`, + `assign`). The resident flow uses a Dialog to create requests, a list page to track them, and a small `BottomNavigation` shell to switch between Home and Maintenance. Admin reuses the existing `AdminLayout` with a new `/admin/maintenance` route; a request-detail dialog handles status/assignment changes. Photo uploads are client-side downscaled to base64 JPEG and stored on the `MaintenanceRequest.photoUrls[]` so localStorage usage stays bounded.

**Tech Stack:** Adds nothing new — uses M1/M2 stack (MUI, MUI X DataGrid, TanStack Query, react-hook-form + zod, i18next).

---

## Plan series context

This is **plan 3 of 8**. Previous: [M1 scaffold](./2026-05-30-student-housing-m1-scaffold.md), [M2 properties](./2026-05-30-student-housing-m2-properties.md). Authoritative references:

- Base spec: [`student-housing-spec.md`](../../../student-housing-spec.md)
- Design decisions: [`docs/superpowers/specs/2026-05-30-student-housing-design.md`](../specs/2026-05-30-student-housing-design.md)

### Scope clarifications

- **Photo upload** is client-side downscale to base64 JPEG (max ~1024px on the long side, quality 0.7, **max 3 photos** per request). Quota errors surface a user-visible warning (the request still gets saved without the offending photo).
- **Photo upload is not unit-tested in M3** — jsdom doesn't implement `HTMLCanvasElement.toDataURL`. The downscale helper is small, pure, and covered by manual smoke check; the form-level test stubs the helper.
- **No real-time push**: status changes appear on resident's next view (TanStack Query refetch on focus / invalidation).
- **Maintenance category** is an enum (design D10), already declared in M1 types. M3 adds translated labels.
- The **Dashboard "Öppna ärenden" card** and the **Property detail "Felanmälningar" section** get real data in this milestone.

---

## File structure map (M3 additions)

Files **created or modified in this milestone** are marked ✦.

```
src/
  app/
    routes.tsx                                  ✦ adds /admin/maintenance, /maintenance
  components/
    ResidentLayout.tsx                          ✦ AppBar + BottomNavigation shell
    ResidentLayout.test.tsx                     ✦
  features/
    dashboard/
      AdminDashboard.tsx                        ✦ wires "open maintenance" count
      ResidentHome.tsx                          ✦ adds quick links + open requests count
    properties/
      PropertyDetailPage.tsx                    ✦ replaces placeholder with real list
    maintenance/
      MaintenanceRequestList.tsx                ✦ shared list (small card per request)
      NewRequestDialog.tsx                      ✦ create-request form (resident)
      ResidentMaintenancePage.tsx               ✦ "my requests" page
      AdminMaintenancePage.tsx                  ✦ inbox DataGrid
      RequestDetailDialog.tsx                   ✦ history + assign + status change
      photoDownscale.ts                         ✦ canvas-based downscale helper
      NewRequestDialog.test.tsx                 ✦
      ResidentMaintenancePage.test.tsx          ✦
      AdminMaintenancePage.test.tsx             ✦
      RequestDetailDialog.test.tsx              ✦
  services/
    api.ts                                      ✦ adds MaintenanceApi
    hooks/
      maintenance.ts                            ✦ useMaintenanceRequests + mutations
      queryKeys.ts                              ✦ adds maintenance keys
    mock/
      fixtures.ts                               ✦ seeds 3 maintenance requests
      seed.ts                                   ✦ seeds the new collection
      maintenanceService.ts                     ✦ CRUD + status transitions
      maintenanceService.test.ts                ✦
      index.ts                                  ✦ wires service into createMockApi
  i18n/
    locales/sv.json                             ✦ adds maintenance.* / nav.maintenance
    locales/en.json                             ✦
```

---

## Task 0: Maintenance fixtures + seed

**Files:**
- Modify: `src/services/mock/fixtures.ts`
- Modify: `src/services/mock/seed.ts`
- Modify: `src/services/mock/seed.test.ts`

- [ ] **Step 1: Extend the seed test**

Append a new `describe` block to `src/services/mock/seed.test.ts`:

```ts
describe('seedDatabase (maintenance)', () => {
  beforeEach(() => localStorage.clear());

  it('seeds at least three maintenance requests covering each status', () => {
    seedDatabase();
    const rows = readCollection<import('@/types').MaintenanceRequest>('maintenance', []);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const statuses = new Set(rows.map((r) => r.status));
    expect(statuses.has('received')).toBe(true);
    expect(statuses.has('in_progress')).toBe(true);
    expect(statuses.has('resolved')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/services/mock/seed`
Expected: FAIL — `rows.length >= 3` is false (no requests seeded yet).

- [ ] **Step 3: Add fixtures**

In `src/services/mock/fixtures.ts`, append after `facilityFixtures`:

```ts
export const maintenanceFixtures: import('@/types').MaintenanceRequest[] = [
  {
    id: 'mr-1',
    propertyId: 'p-101',
    residentId: 'u-res1',
    category: 'plumbing',
    description: 'Vattenkran droppar i köket.',
    photoUrls: [],
    status: 'received',
    createdAt: '2026-05-20T08:00:00Z',
    history: [
      { status: 'received', at: '2026-05-20T08:00:00Z' },
    ],
  },
  {
    id: 'mr-2',
    propertyId: 'p-102',
    residentId: 'u-res2',
    category: 'appliance',
    description: 'Kylskåpet fryser inte ordentligt.',
    photoUrls: [],
    status: 'in_progress',
    assignedTo: 'u-staff',
    createdAt: '2026-05-18T11:30:00Z',
    history: [
      { status: 'received', at: '2026-05-18T11:30:00Z' },
      { status: 'in_progress', at: '2026-05-19T09:00:00Z', note: 'Tekniker bokad' },
    ],
  },
  {
    id: 'mr-3',
    propertyId: 'p-101',
    residentId: 'u-res1',
    category: 'door_lock',
    description: 'Låset hakar upp.',
    photoUrls: [],
    status: 'resolved',
    assignedTo: 'u-staff',
    createdAt: '2026-05-10T14:00:00Z',
    history: [
      { status: 'received', at: '2026-05-10T14:00:00Z' },
      { status: 'in_progress', at: '2026-05-11T10:00:00Z' },
      { status: 'resolved', at: '2026-05-12T15:30:00Z', note: 'Bytt cylinder' },
    ],
  },
];
```

- [ ] **Step 4: Update `seed.ts`**

```ts
import { hasKey, writeCollection } from './storage';
import {
  buildingFixtures, contractFixtures, facilityFixtures, maintenanceFixtures,
  propertyFixtures, userFixtures,
} from './fixtures';

export function seedDatabase(): void {
  if (!hasKey('users')) writeCollection('users', userFixtures);
  if (!hasKey('buildings')) writeCollection('buildings', buildingFixtures);
  if (!hasKey('properties')) writeCollection('properties', propertyFixtures);
  if (!hasKey('contracts')) writeCollection('contracts', contractFixtures);
  if (!hasKey('facilities')) writeCollection('facilities', facilityFixtures);
  if (!hasKey('maintenance')) writeCollection('maintenance', maintenanceFixtures);
}
```

- [ ] **Step 5: Tests + typecheck**

Run: `npx vitest run src/services/mock/seed`
Run: `npm run typecheck` — clean.

- [ ] **Step 6: Commit**

```bash
git add src/services/mock/fixtures.ts src/services/mock/seed.ts src/services/mock/seed.test.ts
git commit -m "feat(m3): seed maintenance fixtures covering received/in_progress/resolved"
```

---

## Task 1: MaintenanceApi interface + mock service

**Files:**
- Modify: `src/services/api.ts`
- Create: `src/services/mock/maintenanceService.ts`
- Modify: `src/services/mock/index.ts`
- Create: `src/services/mock/maintenanceService.test.ts`

- [ ] **Step 1: Write the failing test**

`src/services/mock/maintenanceService.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/services/mock/maintenanceService`
Expected: FAIL — `api.maintenance` is undefined.

- [ ] **Step 3: Extend `src/services/api.ts`**

Append after `UsersApi`:

```ts
import type {
  Contract, MaintenanceRequest, MaintenanceStatus, Property, SafeUser,
} from '@/types';

// ... existing AuthApi, PropertiesApi, ContractsApi, UsersApi ...

export interface MaintenanceCreateInput {
  propertyId: string;
  residentId: string;
  category: import('@/types').MaintenanceCategory;
  description: string;
  photoUrls: string[];
}

export interface MaintenanceApi {
  list(): Promise<MaintenanceRequest[]>;
  byResident(residentId: string): Promise<MaintenanceRequest[]>;
  byProperty(propertyId: string): Promise<MaintenanceRequest[]>;
  get(id: string): Promise<MaintenanceRequest | undefined>;
  create(input: MaintenanceCreateInput): Promise<MaintenanceRequest>;
  updateStatus(id: string, status: MaintenanceStatus, note?: string): Promise<MaintenanceRequest>;
  assign(id: string, staffUserId: string | undefined): Promise<MaintenanceRequest>;
}

export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
  maintenance: MaintenanceApi;
}
```

> Re-write the file as a clean unit; don't leave duplicate `Api` declarations. The full contents are the same as M2 plus the `MaintenanceApi` interface and the new `maintenance` slot on `Api`.

- [ ] **Step 4: Write `src/services/mock/maintenanceService.ts`**

```ts
import type { MaintenanceApi, MaintenanceCreateInput } from '@/services/api';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateId(): string {
  return `mr-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMaintenanceService(): MaintenanceApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      return readCollection<MaintenanceRequest>('maintenance', []);
    },
    async byResident(residentId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<MaintenanceRequest>('maintenance', []).filter(
        (r) => r.residentId === residentId,
      );
    },
    async byProperty(propertyId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<MaintenanceRequest>('maintenance', []).filter(
        (r) => r.propertyId === propertyId,
      );
    },
    async get(id) {
      await delay(MOCK_LATENCY_MS);
      return byId<MaintenanceRequest>('maintenance', id);
    },
    async create(input: MaintenanceCreateInput) {
      await delay(MOCK_LATENCY_MS);
      const now = new Date().toISOString();
      const row: MaintenanceRequest = {
        id: generateId(),
        propertyId: input.propertyId,
        residentId: input.residentId,
        category: input.category,
        description: input.description,
        photoUrls: input.photoUrls,
        status: 'received',
        createdAt: now,
        history: [{ status: 'received', at: now }],
      };
      upsertById<MaintenanceRequest>('maintenance', row);
      return row;
    },
    async updateStatus(id, status: MaintenanceStatus, note) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<MaintenanceRequest>('maintenance', id);
      if (!existing) throw new Error(`maintenance_not_found:${id}`);
      const at = new Date().toISOString();
      const updated: MaintenanceRequest = {
        ...existing,
        status,
        history: [...existing.history, { status, at, note }],
      };
      upsertById<MaintenanceRequest>('maintenance', updated);
      return updated;
    },
    async assign(id, staffUserId) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<MaintenanceRequest>('maintenance', id);
      if (!existing) throw new Error(`maintenance_not_found:${id}`);
      const updated: MaintenanceRequest = { ...existing, assignedTo: staffUserId };
      upsertById<MaintenanceRequest>('maintenance', updated);
      return updated;
    },
  };
}
```

- [ ] **Step 5: Wire into `src/services/mock/index.ts`**

```ts
import type { Api } from '@/services/api';
import { seedDatabase } from './seed';
import { createAuthService } from './authService';
import { createPropertiesService } from './propertiesService';
import { createContractsService } from './contractsService';
import { createUsersService } from './usersService';
import { createMaintenanceService } from './maintenanceService';

export function createMockApi(): Api {
  seedDatabase();
  return {
    auth: createAuthService(),
    properties: createPropertiesService(),
    contracts: createContractsService(),
    users: createUsersService(),
    maintenance: createMaintenanceService(),
  };
}
```

- [ ] **Step 6: Tests + typecheck**

Run: `npx vitest run src/services/mock/maintenanceService`
Expected: PASS (6 tests).

Run: `npm run typecheck` — clean.

- [ ] **Step 7: Commit**

```bash
git add src/services
git commit -m "feat(m3): add maintenance mock service with status transitions and history"
```

---

## Task 2: Photo downscale utility

**Files:**
- Create: `src/features/maintenance/photoDownscale.ts`

> No test in M3 — jsdom doesn't implement `HTMLCanvasElement.toDataURL`. Covered by manual smoke and the form-level test (which stubs this).

- [ ] **Step 1: Write `src/features/maintenance/photoDownscale.ts`**

```ts
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

/**
 * Downscale an image File to a base64 JPEG that's at most MAX_DIMENSION on its
 * longer side. Returns the data URL string (suitable for an <img src>) and
 * suitable for direct localStorage write. Throws if the input is not an image.
 */
export async function downscaleToBase64Jpeg(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('not_an_image');
  }
  const bitmap = await readBitmap(file);
  const { width, height } = fitDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function fitDimensions(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w >= h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function readBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_load_failed'));
    };
    img.src = url;
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` — clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/maintenance/photoDownscale.ts
git commit -m "feat(m3): add client-side image downscale helper (max 1024px, JPEG 0.7)"
```

---

## Task 3: Maintenance query hooks

**Files:**
- Modify: `src/services/hooks/queryKeys.ts`
- Create: `src/services/hooks/maintenance.ts`

- [ ] **Step 1: Extend `queryKeys.ts`**

Add to the `keys` object:

```ts
  maintenance: () => ['maintenance'] as const,
  maintenanceByResident: (residentId: string) => ['maintenance', 'byResident', residentId] as const,
  maintenanceByProperty: (propertyId: string) => ['maintenance', 'byProperty', propertyId] as const,
  maintenanceRequest: (id: string) => ['maintenance', id] as const,
```

Full file:

```ts
export const keys = {
  properties: () => ['properties'] as const,
  property: (id: string) => ['properties', id] as const,
  contractByProperty: (propertyId: string) => ['contracts', 'byProperty', propertyId] as const,
  users: () => ['users'] as const,
  user: (id: string) => ['users', id] as const,
  maintenance: () => ['maintenance'] as const,
  maintenanceByResident: (residentId: string) => ['maintenance', 'byResident', residentId] as const,
  maintenanceByProperty: (propertyId: string) => ['maintenance', 'byProperty', propertyId] as const,
  maintenanceRequest: (id: string) => ['maintenance', id] as const,
};
```

- [ ] **Step 2: Write `src/services/hooks/maintenance.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaintenanceCreateInput } from '@/services/api';
import type { MaintenanceStatus } from '@/types';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useMaintenanceRequests() {
  return useQuery({
    queryKey: keys.maintenance(),
    queryFn: () => api.maintenance.list(),
  });
}

export function useMaintenanceByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId ? keys.maintenanceByResident(residentId) : ['maintenance', 'byResident', 'none'],
    queryFn: () => api.maintenance.byResident(residentId as string),
    enabled: Boolean(residentId),
  });
}

export function useMaintenanceByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId ? keys.maintenanceByProperty(propertyId) : ['maintenance', 'byProperty', 'none'],
    queryFn: () => api.maintenance.byProperty(propertyId as string),
    enabled: Boolean(propertyId),
  });
}

export function useMaintenanceRequest(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.maintenanceRequest(id) : ['maintenance', 'none'],
    queryFn: async () => (await api.maintenance.get(id as string)) ?? null,
    enabled: Boolean(id),
  });
}

export function useCreateMaintenanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MaintenanceCreateInput) => api.maintenance.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.maintenance() }),
  });
}

export function useUpdateMaintenanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: MaintenanceStatus; note?: string }) =>
      api.maintenance.updateStatus(id, status, note),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.maintenance() });
      qc.invalidateQueries({ queryKey: keys.maintenanceRequest(row.id) });
    },
  });
}

export function useAssignMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, staffUserId }: { id: string; staffUserId: string | undefined }) =>
      api.maintenance.assign(id, staffUserId),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.maintenance() });
      qc.invalidateQueries({ queryKey: keys.maintenanceRequest(row.id) });
    },
  });
}
```

- [ ] **Step 3: Typecheck + smoke test**

Run: `npm run typecheck` — clean.
Run: `npx vitest run src/services` — existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/services/hooks
git commit -m "feat(m3): add maintenance query hooks and mutation invalidations"
```

---

## Task 4: i18n keys for maintenance

**Files:**
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json`

- [ ] **Step 1: Append blocks**

Inside `sv.json` root, add:

```json
"maintenance": {
  "title": "Felanmälningar",
  "myTitle": "Mina felanmälningar",
  "new": "Ny felanmälan",
  "category": "Kategori",
  "description": "Beskrivning",
  "photos": "Bilder (max 3)",
  "addPhotos": "Lägg till bilder",
  "submit": "Skicka",
  "cancel": "Avbryt",
  "history": "Historik",
  "assignTo": "Tilldela",
  "assignee": "Tilldelad",
  "unassigned": "Ej tilldelad",
  "changeStatus": "Ändra status",
  "addNote": "Anteckning (valfri)",
  "save": "Spara",
  "empty": "Inga felanmälningar",
  "createdAt": "Skapad",
  "required": "Obligatoriskt",
  "photoTooManyError": "Max 3 bilder",
  "photoSaveError": "Kunde inte spara alla bilder (lagringskvot överskriden)",
  "property": "Bostad",
  "resident": "Boende",
  "category_labels": {
    "appliance": "Vitvaror",
    "plumbing": "VVS",
    "electrical": "El",
    "heating": "Värme",
    "door_lock": "Lås/Dörr",
    "internet": "Internet",
    "other": "Övrigt"
  }
},
```

And inside `nav`: add `"maintenance": "Felanmälningar"`.

Inside `en.json` root, mirror it:

```json
"maintenance": {
  "title": "Maintenance",
  "myTitle": "My maintenance",
  "new": "New request",
  "category": "Category",
  "description": "Description",
  "photos": "Photos (max 3)",
  "addPhotos": "Add photos",
  "submit": "Submit",
  "cancel": "Cancel",
  "history": "History",
  "assignTo": "Assign",
  "assignee": "Assignee",
  "unassigned": "Unassigned",
  "changeStatus": "Change status",
  "addNote": "Note (optional)",
  "save": "Save",
  "empty": "No maintenance requests",
  "createdAt": "Created",
  "required": "Required",
  "photoTooManyError": "Max 3 photos",
  "photoSaveError": "Could not save all photos (storage quota exceeded)",
  "property": "Property",
  "resident": "Resident",
  "category_labels": {
    "appliance": "Appliance",
    "plumbing": "Plumbing",
    "electrical": "Electrical",
    "heating": "Heating",
    "door_lock": "Lock/Door",
    "internet": "Internet",
    "other": "Other"
  }
},
```

And inside `nav`: `"maintenance": "Maintenance"`.

- [ ] **Step 2: Sanity test**

Run: `npx vitest run src/i18n` — still 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/i18n
git commit -m "feat(m3): add maintenance i18n keys (sv + en)"
```

---

## Task 5: ResidentLayout (AppBar + BottomNavigation)

**Files:**
- Create: `src/components/ResidentLayout.tsx`
- Create: `src/components/ResidentLayout.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentLayout } from '@/components/ResidentLayout';

function Tree() {
  return (
    <Routes>
      <Route element={<ResidentLayout />}>
        <Route path="/home" element={<div>HOME CONTENT</div>} />
        <Route path="/maintenance" element={<div>MAINT CONTENT</div>} />
      </Route>
    </Routes>
  );
}

describe('ResidentLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('renders the active route and the bottom nav', () => {
    renderWithProviders(<Tree />, { route: '/home' });
    expect(screen.getByText('HOME CONTENT')).toBeInTheDocument();
    // Both nav items present (label or aria-label)
    expect(screen.getByRole('button', { name: /hem/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /felanmälningar/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/components/ResidentLayout`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/ResidentLayout.tsx`**

```tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import { AppBarActions } from './AppBarActions';

export function ResidentLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const value = pathname.startsWith('/maintenance') ? '/maintenance' : '/home';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', pb: 8 }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{t('app.name')}</Typography>
          <AppBarActions />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
        <Toolbar />
        <Outlet />
      </Box>
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={value}
          onChange={(_, next) => navigate(next)}
        >
          <BottomNavigationAction value="/home" label={t('nav.home')} icon={<HomeIcon />} />
          <BottomNavigationAction
            value="/maintenance"
            label={t('nav.maintenance')}
            icon={<BuildIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/components/ResidentLayout`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResidentLayout.tsx src/components/ResidentLayout.test.tsx
git commit -m "feat(m3): add resident layout with AppBar and BottomNavigation"
```

---

## Task 6: NewRequestDialog (resident create flow)

**Files:**
- Create: `src/features/maintenance/NewRequestDialog.tsx`
- Create: `src/features/maintenance/NewRequestDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { NewRequestDialog } from '@/features/maintenance/NewRequestDialog';
import { seedDatabase } from '@/services/mock/seed';

vi.mock('@/features/maintenance/photoDownscale', () => ({
  downscaleToBase64Jpeg: async (f: File) => `data:image/jpeg;base64,STUB(${f.name})`,
}));

describe('NewRequestDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('submits a request with category, description, and one photo', async () => {
    const onClose = vi.fn();
    renderWithProviders(<NewRequestDialog open onClose={onClose} propertyId="p-101" />);

    await userEvent.click(screen.getByLabelText(/kategori/i));
    await userEvent.click(screen.getByRole('option', { name: /vvs/i }));
    await userEvent.type(screen.getByLabelText(/beskrivning/i), 'Toalett rinner.');

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } });

    await userEvent.click(screen.getByRole('button', { name: /^skicka$/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('rejects a 4th photo', async () => {
    renderWithProviders(<NewRequestDialog open onClose={() => {}} propertyId="p-101" />);
    const input = screen.getByTestId('photo-input');
    const files = [1, 2, 3, 4].map((i) => new File(['x'], `${i}.png`, { type: 'image/png' }));
    fireEvent.change(input, { target: { files } });
    await waitFor(() => expect(screen.getByText(/max 3 bilder/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/maintenance/NewRequestDialog`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/features/maintenance/NewRequestDialog.tsx`**

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
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import type { MaintenanceCategory } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { useCreateMaintenanceRequest } from '@/services/hooks/maintenance';
import { downscaleToBase64Jpeg } from './photoDownscale';

const MAX_PHOTOS = 3;

const categories: MaintenanceCategory[] = [
  'appliance', 'plumbing', 'electrical', 'heating', 'door_lock', 'internet', 'other',
];

const schema = z.object({
  category: z.enum(categories as [MaintenanceCategory, ...MaintenanceCategory[]]),
  description: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
}

export function NewRequestDialog({ open, onClose, propertyId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const create = useCreateMaintenanceRequest();
  const [photos, setPhotos] = useState<string[]>([]);
  const [tooMany, setTooMany] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { category: 'other', description: '' },
    });

  async function handleFiles(files: FileList | null) {
    setTooMany(false);
    setSaveError(false);
    if (!files) return;
    const incoming = Array.from(files);
    if (photos.length + incoming.length > MAX_PHOTOS) {
      setTooMany(true);
      return;
    }
    const next = [...photos];
    for (const f of incoming) {
      try {
        next.push(await downscaleToBase64Jpeg(f));
      } catch {
        setSaveError(true);
      }
    }
    setPhotos(next);
  }

  function close() {
    reset();
    setPhotos([]);
    setTooMany(false);
    setSaveError(false);
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    if (!user) return;
    try {
      await create.mutateAsync({
        propertyId,
        residentId: user.id,
        category: values.category,
        description: values.description,
        photoUrls: photos,
      });
      close();
    } catch {
      // Likely localStorage quota exceeded — keep dialog open with a warning.
      setSaveError(true);
    }
  });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{t('maintenance.new')}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {tooMany && <Alert severity="warning">{t('maintenance.photoTooManyError')}</Alert>}
            {saveError && <Alert severity="error">{t('maintenance.photoSaveError')}</Alert>}
            <TextField
              select
              label={t('maintenance.category')}
              defaultValue="other"
              {...register('category')}
            >
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {t(`maintenance.category_labels.${c}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('maintenance.description')}
              multiline
              minRows={3}
              error={Boolean(errors.description)}
              helperText={errors.description && t('maintenance.required')}
              {...register('description')}
            />
            <Button variant="outlined" component="label">
              {t('maintenance.addPhotos')}
              <input
                data-testid="photo-input"
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
              />
            </Button>
            {photos.length > 0 && (
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                {photos.map((src, i) => (
                  <Box key={`${i}-${src.length}`} sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={src}
                      alt=""
                      sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                    />
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 0, right: 0 }}
                      onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="remove"
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t('maintenance.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t('maintenance.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/features/maintenance/NewRequestDialog`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/maintenance/NewRequestDialog.tsx src/features/maintenance/NewRequestDialog.test.tsx
git commit -m "feat(m3): add resident new-request dialog with photo upload and limits"
```

---

## Task 7: ResidentMaintenancePage (own requests list)

**Files:**
- Create: `src/features/maintenance/MaintenanceRequestList.tsx`
- Create: `src/features/maintenance/ResidentMaintenancePage.tsx`
- Create: `src/features/maintenance/ResidentMaintenancePage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentMaintenancePage } from '@/features/maintenance/ResidentMaintenancePage';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentMaintenancePage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('lists only the resident\'s own seeded requests', async () => {
    renderWithProviders(<ResidentMaintenancePage />, { route: '/maintenance' });
    await waitFor(() =>
      expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/låset hakar upp/i)).toBeInTheDocument();
    // Not the other resident's request
    expect(screen.queryByText(/kylskåpet fryser/i)).not.toBeInTheDocument();
  });

  it('opens the new-request dialog when the button is clicked', async () => {
    renderWithProviders(<ResidentMaintenancePage />, { route: '/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /ny felanmälan/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/maintenance/ResidentMaintenancePage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/features/maintenance/MaintenanceRequestList.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { MaintenanceRequest } from '@/types';
import { StatusChip } from '@/components/StatusChip';

interface Props {
  rows: MaintenanceRequest[];
  emptyLabel: string;
  onSelect?: (row: MaintenanceRequest) => void;
}

export function MaintenanceRequestList({ rows, emptyLabel, onSelect }: Props) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <Typography color="text.secondary">{emptyLabel}</Typography>;
  }
  return (
    <Stack sx={{ gap: 1 }}>
      {rows.map((row) => {
        const body = (
          <CardContent>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography variant="overline" color="text.secondary">
                {t(`maintenance.category_labels.${row.category}`)}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <StatusChip kind="maintenance" value={row.status} />
            </Stack>
            <Typography sx={{ mt: 0.5 }}>{row.description}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('maintenance.createdAt')}: {row.createdAt.slice(0, 10)}
            </Typography>
          </CardContent>
        );
        return (
          <Card key={row.id}>
            {onSelect
              ? <CardActionArea onClick={() => onSelect(row)}>{body}</CardActionArea>
              : body}
          </Card>
        );
      })}
    </Stack>
  );
}
```

- [ ] **Step 4: Write `src/features/maintenance/ResidentMaintenancePage.tsx`**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import { readCollection } from '@/services/mock/storage';
import type { Property } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { useMaintenanceByResident } from '@/services/hooks/maintenance';
import { MaintenanceRequestList } from './MaintenanceRequestList';
import { NewRequestDialog } from './NewRequestDialog';

export function ResidentMaintenancePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const requests = useMaintenanceByResident(user?.id);
  const [creating, setCreating] = useState(false);

  // residents are assigned to one property — find it from the seeded properties
  // by residentId. We read directly from storage to avoid a new hook.
  const myProperty = user
    ? readCollection<Property>('properties', []).find((p) => p.residentId === user.id)
    : undefined;

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('maintenance.myTitle')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!myProperty}
          onClick={() => setCreating(true)}
        >
          {t('maintenance.new')}
        </Button>
      </Stack>
      {requests.isLoading
        ? <Skeleton variant="rectangular" height={200} />
        : <MaintenanceRequestList rows={requests.data ?? []} emptyLabel={t('maintenance.empty')} />}

      {myProperty && (
        <NewRequestDialog
          open={creating}
          onClose={() => setCreating(false)}
          propertyId={myProperty.id}
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/maintenance/ResidentMaintenancePage`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/maintenance/MaintenanceRequestList.tsx src/features/maintenance/ResidentMaintenancePage.tsx src/features/maintenance/ResidentMaintenancePage.test.tsx
git commit -m "feat(m3): add resident maintenance page with own-requests list"
```

---

## Task 8: AdminMaintenancePage (inbox DataGrid)

**Files:**
- Create: `src/features/maintenance/AdminMaintenancePage.tsx`
- Create: `src/features/maintenance/AdminMaintenancePage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminMaintenancePage } from '@/features/maintenance/AdminMaintenancePage';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminMaintenancePage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('lists every seeded request', async () => {
    renderWithProviders(<AdminMaintenancePage />, { route: '/admin/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    expect(screen.getByText(/kylskåpet fryser/i)).toBeInTheDocument();
    expect(screen.getByText(/låset hakar upp/i)).toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderWithProviders(<AdminMaintenancePage />, { route: '/admin/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/^status$/i));
    await userEvent.click(screen.getByRole('option', { name: /^löst$/i }));
    await waitFor(() => expect(screen.queryByText(/vattenkran droppar/i)).not.toBeInTheDocument());
    expect(screen.getByText(/låset hakar upp/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/maintenance/AdminMaintenancePage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/features/maintenance/AdminMaintenancePage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types';
import { useMaintenanceRequests } from '@/services/hooks/maintenance';
import { useUsers } from '@/services/hooks/users';
import { useProperties } from '@/services/hooks/properties';
import { StatusChip } from '@/components/StatusChip';
import { RequestDetailDialog } from './RequestDetailDialog';

type StatusFilter = 'all' | MaintenanceStatus;

export function AdminMaintenancePage() {
  const { t } = useTranslation();
  const requests = useMaintenanceRequests();
  const users = useUsers();
  const properties = useProperties();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const userById = useMemo(() => {
    const map = new Map(users.data?.map((u) => [u.id, u]) ?? []);
    return map;
  }, [users.data]);

  const propertyById = useMemo(() => {
    const map = new Map(properties.data?.map((p) => [p.id, p]) ?? []);
    return map;
  }, [properties.data]);

  const rows = useMemo(() => {
    const all = requests.data ?? [];
    if (statusFilter === 'all') return all;
    return all.filter((r) => r.status === statusFilter);
  }, [requests.data, statusFilter]);

  const columns = useMemo<GridColDef<MaintenanceRequest>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: t('maintenance.createdAt'),
        width: 120,
        valueFormatter: (value: string) => value.slice(0, 10),
      },
      {
        field: 'category',
        headerName: t('maintenance.category'),
        width: 130,
        valueFormatter: (value: string) => t(`maintenance.category_labels.${value}`),
      },
      {
        field: 'description',
        headerName: t('maintenance.description'),
        flex: 1,
      },
      {
        field: 'propertyId',
        headerName: t('maintenance.property'),
        width: 120,
        renderCell: (p) => propertyById.get(p.row.propertyId)?.name ?? p.row.propertyId,
      },
      {
        field: 'residentId',
        headerName: t('maintenance.resident'),
        width: 160,
        renderCell: (p) => userById.get(p.row.residentId)?.name ?? p.row.residentId,
      },
      {
        field: 'assignedTo',
        headerName: t('maintenance.assignee'),
        width: 140,
        renderCell: (p) =>
          p.row.assignedTo ? userById.get(p.row.assignedTo)?.name ?? p.row.assignedTo
            : t('maintenance.unassigned'),
      },
      {
        field: 'status',
        headerName: t('maintenance.title'),
        width: 140,
        renderCell: (p) => <StatusChip kind="maintenance" value={p.row.status} />,
      },
    ],
    [t, userById, propertyById],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('maintenance.title')}</Typography>
      </Stack>
      <Stack direction="row" sx={{ mb: 2, gap: 2 }}>
        <TextField
          select
          label={t('properties.status')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          sx={{ width: 220 }}
        >
          <MenuItem value="all">{t('properties.all')}</MenuItem>
          <MenuItem value="received">{t('status.maintenance.received')}</MenuItem>
          <MenuItem value="in_progress">{t('status.maintenance.in_progress')}</MenuItem>
          <MenuItem value="resolved">{t('status.maintenance.resolved')}</MenuItem>
        </TextField>
      </Stack>
      {requests.isLoading
        ? <Skeleton variant="rectangular" height={400} />
        : <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => setOpenId(p.row.id)}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            localeText={rows.length === 0 ? { noRowsLabel: t('maintenance.empty') } : undefined}
          />}
      <RequestDetailDialog
        requestId={openId}
        onClose={() => setOpenId(null)}
      />
    </Box>
  );
}
```

> Depends on `RequestDetailDialog` from Task 9 — create the stub first.

- [ ] **Step 4: Stub `RequestDetailDialog`**

`src/features/maintenance/RequestDetailDialog.tsx`:

```tsx
interface Props {
  requestId: string | null;
  onClose: () => void;
}

export function RequestDetailDialog(_props: Props) {
  return null;
}
```

- [ ] **Step 5: Tests + typecheck**

Run: `npx vitest run src/features/maintenance/AdminMaintenancePage`
Expected: PASS (2 tests).

Run: `npm run typecheck` — clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/maintenance/AdminMaintenancePage.tsx src/features/maintenance/AdminMaintenancePage.test.tsx src/features/maintenance/RequestDetailDialog.tsx
git commit -m "feat(m3): add admin maintenance inbox DataGrid with status filter"
```

---

## Task 9: RequestDetailDialog (history + assign + status change)

**Files:**
- Modify: `src/features/maintenance/RequestDetailDialog.tsx`
- Create: `src/features/maintenance/RequestDetailDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequestDetailDialog } from '@/features/maintenance/RequestDetailDialog';
import { seedDatabase } from '@/services/mock/seed';

describe('RequestDetailDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('changes status to in_progress and shows the new history entry', async () => {
    renderWithProviders(
      <RequestDetailDialog requestId="mr-1" onClose={() => {}} />,
      { route: '/admin/maintenance' },
    );
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/ändra status/i));
    await userEvent.click(screen.getByRole('option', { name: /^pågår$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^spara$/i }));
    await waitFor(() => {
      const items = screen.getAllByRole('listitem');
      // two history entries now (received, in_progress)
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('assigns a staff member', async () => {
    renderWithProviders(
      <RequestDetailDialog requestId="mr-1" onClose={() => {}} />,
      { route: '/admin/maintenance' },
    );
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/^tilldela$/i));
    await userEvent.click(screen.getByRole('option', { name: /sven staff/i }));
    await waitFor(() => expect(screen.getByText(/sven staff/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/maintenance/RequestDetailDialog`
Expected: FAIL — dialog renders nothing.

- [ ] **Step 3: Write `src/features/maintenance/RequestDetailDialog.tsx`** (replaces stub)

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import type { MaintenanceStatus } from '@/types';
import {
  useAssignMaintenance, useMaintenanceRequest, useUpdateMaintenanceStatus,
} from '@/services/hooks/maintenance';
import { useUsers } from '@/services/hooks/users';
import { StatusChip } from '@/components/StatusChip';

const STATUSES: MaintenanceStatus[] = ['received', 'in_progress', 'resolved'];
const UNASSIGNED = '__unassigned__';

interface Props {
  requestId: string | null;
  onClose: () => void;
}

export function RequestDetailDialog({ requestId, onClose }: Props) {
  const { t } = useTranslation();
  const open = Boolean(requestId);
  const request = useMaintenanceRequest(requestId ?? undefined);
  const users = useUsers();
  const update = useUpdateMaintenanceStatus();
  const assign = useAssignMaintenance();

  const staff = useMemo(
    () => users.data?.filter((u) => u.role === 'admin' || u.role === 'staff') ?? [],
    [users.data],
  );

  const [nextStatus, setNextStatus] = useState<MaintenanceStatus>('received');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (request.data) setNextStatus(request.data.status);
  }, [request.data]);

  if (!open) return null;
  const row = request.data;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {row ? t(`maintenance.category_labels.${row.category}`) : '...'}
      </DialogTitle>
      <DialogContent>
        {row && (
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <StatusChip kind="maintenance" value={row.status} />
              <Box sx={{ flexGrow: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {t('maintenance.createdAt')}: {row.createdAt.slice(0, 10)}
              </Typography>
            </Stack>
            <Typography>{row.description}</Typography>

            {row.photoUrls.length > 0 && (
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                {row.photoUrls.map((src, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={src}
                    alt=""
                    sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }}
                  />
                ))}
              </Stack>
            )}

            <TextField
              select
              label={t('maintenance.assignTo')}
              value={row.assignedTo ?? UNASSIGNED}
              onChange={(e) => {
                const v = e.target.value;
                void assign.mutateAsync({
                  id: row.id,
                  staffUserId: v === UNASSIGNED ? undefined : v,
                });
              }}
            >
              <MenuItem value={UNASSIGNED}>{t('maintenance.unassigned')}</MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>

            <Stack direction="row" sx={{ gap: 2, alignItems: 'flex-start' }}>
              <TextField
                select
                label={t('maintenance.changeStatus')}
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as MaintenanceStatus)}
                sx={{ width: 200 }}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {t(`status.maintenance.${s}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('maintenance.addNote')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                disabled={nextStatus === row.status && note.trim() === ''}
                onClick={async () => {
                  await update.mutateAsync({ id: row.id, status: nextStatus, note: note || undefined });
                  setNote('');
                }}
              >
                {t('maintenance.save')}
              </Button>
            </Stack>

            <Typography variant="h6">{t('maintenance.history')}</Typography>
            <List dense>
              {row.history.map((entry, i) => (
                <ListItem key={i}>
                  <ListItemText
                    primary={`${t(`status.maintenance.${entry.status}`)} — ${entry.at.slice(0, 10)}`}
                    secondary={entry.note}
                  />
                </ListItem>
              ))}
            </List>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('maintenance.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/features/maintenance/RequestDetailDialog`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/maintenance/RequestDetailDialog.tsx src/features/maintenance/RequestDetailDialog.test.tsx
git commit -m "feat(m3): add maintenance request detail dialog with assign and status change"
```

---

## Task 10: Wire dashboard "open maintenance" card

**Files:**
- Modify: `src/features/dashboard/AdminDashboard.tsx`
- Modify: `src/features/dashboard/AdminDashboard.test.tsx`

- [ ] **Step 1: Update the dashboard test**

Replace the only test with:

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

  it('shows the property counts and the open maintenance count', async () => {
    renderWithProviders(<AdminDashboard />, { route: '/admin' });
    await waitFor(() => {
      // properties: 8 total, 2 occupied → 25%, 6 vacant
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      // maintenance: 2 open (received + in_progress), 1 resolved
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Update `AdminDashboard.tsx`**

Replace the `cards` array section:

```tsx
import { useMaintenanceRequests } from '@/services/hooks/maintenance';
// ...

export function AdminDashboard() {
  const { t } = useTranslation();
  const properties = useProperties();
  const maintenance = useMaintenanceRequests();
  const total = properties.data?.length ?? 0;
  const occupied = properties.data?.filter((p) => p.status === 'occupied').length ?? 0;
  const occupancyPct = total === 0 ? 0 : Math.round((occupied / total) * 100);
  const vacancies = total - occupied;
  const openMaintenance =
    maintenance.data?.filter((r) => r.status !== 'resolved').length ?? 0;

  const cards: CardSpec[] = [
    { label: t('dashboard.properties'), value: total, to: '/admin/properties' },
    { label: t('dashboard.occupancy'), value: `${occupancyPct}%`, to: '/admin/properties' },
    { label: t('dashboard.vacancies'), value: vacancies, to: '/admin/properties' },
    { label: t('dashboard.openMaintenance'), value: openMaintenance, to: '/admin/maintenance' },
    { label: t('dashboard.unpaidRent'), value: 0 },
    { label: t('dashboard.upcomingMoveOuts'), value: 0 },
  ];

  // ... rest unchanged
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/dashboard`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard
git commit -m "feat(m3): wire dashboard open-maintenance card to live count"
```

---

## Task 11: Property detail — real maintenance list

**Files:**
- Modify: `src/features/properties/PropertyDetailPage.tsx`
- Modify: `src/features/properties/PropertyDetailPage.test.tsx`

- [ ] **Step 1: Update the test**

Add a new test alongside the existing ones:

```tsx
it('renders this property\'s maintenance requests', async () => {
  renderWithProviders(<Tree />, { route: '/admin/properties/p-101' });
  await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
  expect(screen.getByText(/låset hakar upp/i)).toBeInTheDocument();
});
```

Also: the existing test expected the placeholder text "Felanmälningar visas i nästa milstolpe" on a property page — that text is now removed, so the existing test doesn't need adjusting (it doesn't assert on the placeholder).

- [ ] **Step 2: Update `PropertyDetailPage.tsx`**

Replace the maintenance `<Card>` block:

```tsx
import { useMaintenanceByProperty } from '@/services/hooks/maintenance';
import { MaintenanceRequestList } from '@/features/maintenance/MaintenanceRequestList';
// ...

const requests = useMaintenanceByProperty(id);

// ...inside the JSX, replace the maintenance card:
<Card>
  <CardContent>
    <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.maintenance')}</Typography>
    {requests.isLoading
      ? <Skeleton variant="rectangular" height={120} />
      : <MaintenanceRequestList rows={requests.data ?? []} emptyLabel={t('maintenance.empty')} />}
  </CardContent>
</Card>
```

Remove the `propertyDetail.maintenancePlaceholder` reference.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/properties/PropertyDetailPage`
Expected: PASS (4 tests).

Run: `npm run typecheck` — clean.

- [ ] **Step 4: Commit**

```bash
git add src/features/properties/PropertyDetailPage.tsx src/features/properties/PropertyDetailPage.test.tsx
git commit -m "feat(m3): show this property's maintenance requests in property detail"
```

---

## Task 12: Routes + resident layout wiring

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/app/routes.test.tsx`
- Modify: `src/components/AdminLayout.tsx` (add maintenance to the drawer)

- [ ] **Step 1: Add an admin-maintenance test + a resident-maintenance test**

Append to `src/app/routes.test.tsx`:

```tsx
it('renders the admin maintenance page', async () => {
  localStorage.setItem('studhem.v1.session', JSON.stringify(
    { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
  ));
  renderWithProviders(<AppRoutes />, { route: '/admin/maintenance' });
  await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
});

it('renders the resident maintenance page under the resident layout', async () => {
  localStorage.setItem('studhem.v1.session', JSON.stringify(
    { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
  ));
  renderWithProviders(<AppRoutes />, { route: '/maintenance' });
  await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
  // Bottom nav visible
  expect(screen.getByRole('button', { name: /felanmälningar/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/app/routes`
Expected: FAIL — routes for those paths don't exist yet.

- [ ] **Step 3: Update `src/app/routes.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { OnboardingPage } from '@/features/auth/OnboardingPage';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { AdminMaintenancePage } from '@/features/maintenance/AdminMaintenancePage';
import { ResidentMaintenancePage } from '@/features/maintenance/ResidentMaintenancePage';
import { AdminLayout } from '@/components/AdminLayout';
import { ResidentLayout } from '@/components/ResidentLayout';
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
        <Route path="maintenance" element={<AdminMaintenancePage />} />
      </Route>
      <Route
        element={<RequireRole roles={['resident']}><ResidentLayout /></RequireRole>}
      >
        <Route path="/home" element={<ResidentHome />} />
        <Route path="/maintenance" element={<ResidentMaintenancePage />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Add maintenance to the admin drawer**

In `src/components/AdminLayout.tsx`, extend the `items` array:

```tsx
import BuildIcon from '@mui/icons-material/Build';
// ...
const items = useMemo(
  () => [
    { to: '/admin', icon: <DashboardIcon />, label: t('nav.dashboard'), end: true },
    { to: '/admin/properties', icon: <ApartmentIcon />, label: t('nav.properties'), end: false },
    { to: '/admin/maintenance', icon: <BuildIcon />, label: t('nav.maintenance'), end: false },
  ],
  [t],
);
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/app/routes`
Expected: all pass.

Run: `npx vitest run` — full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/app src/components/AdminLayout.tsx
git commit -m "feat(m3): wire admin and resident maintenance routes; extend admin drawer"
```

---

## Task 13: Milestone verification & gate

- [ ] **Step 1: Full test suite green**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Typecheck clean**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Production build succeeds**

Run: `npm run build`
Expected: build completes.

- [ ] **Step 4: Manual dev-server smoke**

Run `npm run dev`. Verify, console open and clean:

- Admin: dashboard shows 8 / 25% / 6 properties and 2 open maintenance. Click "Öppna ärenden" → admin inbox; filter by status; click a row → detail dialog; change status to "Pågår" with a note → history grows; assign Sven Staff → row shows the assignee.
- Resident `resident` / `resident123`: BottomNav has Hem + Felanmälningar. /maintenance lists Rasmus's two requests (not Rebecka's). "Ny felanmälan" opens the dialog; submit with a small photo (image file under 1 MB) → toast/closes and the new row appears with status "Mottagen".
- Resident `resident2` / `resident123`: sees Rebecka's request (kylskåp) only.
- Pending user still routes through /onboarding.
- Property detail of an occupied property shows the resident's requests in the "Felanmälningar" card.
- Theme + language toggles still work and persist.

Stop the dev server.

- [ ] **Step 5: Acceptance check (spec §10)**

> *"A resident can submit a maintenance request with a photo; it appears in the admin inbox; status changes by the admin are visible to the resident."*

Confirmed end-to-end.

- [ ] **Step 6: Final milestone commit (if uncommitted changes remain)**

```bash
git add -A
git commit -m "chore(m3): milestone 3 (maintenance) complete"
```

---

## Definition of done (Milestone 3)

- `npx vitest run`, `npm run typecheck`, and `npm run build` all green.
- Residents can create a maintenance request (with up to 3 downscaled photos) and see their own requests; admin can view all, assign staff, and change status with a note; status history is preserved and visible.
- Dashboard "open maintenance" card and property-detail "Felanmälningar" section show live data.
- New `ResidentLayout` (AppBar + BottomNavigation) hosts `/home` and `/maintenance`; admin drawer gains a Felanmälningar entry.
- All new strings live in i18n; no raw pixel spacing; statuses use `StatusChip`.
