# Student Housing App — Milestone 1 (Scaffold) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Vite + React 18 + TypeScript + MUI app skeleton with light/dark theme, sv/en i18n, a localStorage-backed mock service layer, mock auth, and role-based route guards, so that an admin and a resident can log in and land on their respective (placeholder) home screens — fully test-driven.

**Architecture:** A single-page React app whose UI talks to a typed `Api` interface (`src/services/api.ts`). The only implementation in v1 is a localStorage-backed mock (`src/services/mock/*`) seeded from typed fixtures. Cross-cutting concerns are React contexts/providers composed at the app root: TanStack Query (async state), MUI theme + color-mode, i18next (sv default / en fallback), and a mock `AuthContext`. Routing is guarded by role.

**Tech Stack:** React 18, TypeScript, Vite 5, MUI v6 (`@mui/material`, `@mui/icons-material`, `@mui/x-data-grid`, `@mui/x-date-pickers`), React Router v6, TanStack Query v5, react-hook-form + zod, react-i18next, dayjs. Tests: Vitest + React Testing Library + jsdom.

---

## Plan series context

This is **plan 1 of 8** (one per spec milestone). It is self-contained and produces working, testable software. Subsequent milestone plans (properties, maintenance, chat, economy, bookings, move-out, documents+polish) are written just-in-time against the real codebase. Authoritative references:

- Base spec: [`student-housing-spec.md`](../../../student-housing-spec.md)
- Design decisions & additions: [`docs/superpowers/specs/2026-05-30-student-housing-design.md`](../specs/2026-05-30-student-housing-design.md)

---

## Full-app file structure map (roadmap)

Files **this milestone (M1)** creates are marked ✦. Others are listed so the decomposition is visible; later milestones create them.

```
src/
  main.tsx                         ✦ React entry, mounts <App/>
  vite-env.d.ts                    ✦
  app/
    App.tsx                        ✦ Composes providers + routes
    providers.tsx                  ✦ QueryClient, Theme/ColorMode, Auth, i18n, Localization
    routes.tsx                     ✦ <Routes> table + role landing/redirect
  theme/
    theme.ts                       ✦ createTheme factory (light/dark)
    ColorModeContext.tsx           ✦ mode state + toggle, persisted
  i18n/
    index.ts                       ✦ i18next init
    locales/sv.json                ✦
    locales/en.json                ✦
  auth/
    AuthContext.tsx                ✦ mock auth state, login/logout
    guards.tsx                     ✦ RequireAuth, RequireRole, RootRedirect
    paths.ts                       ✦ homePathFor(role)
  components/                      (later: StatusChip, PageHeader, EmptyState, ...)
  features/
    auth/
      LoginPage.tsx                ✦ username/password form
      OnboardingPage.tsx           (M-invite)
    properties/ ...                (M2)
    maintenance/ ...               (M3)
    chat/ ...                      (M4)
    economy/ ...                   (M5)
    bookings/ ...                  (M6)
    documents/ ...                 (M8)
    dashboard/
      AdminDashboard.tsx           ✦ placeholder (real cards in M2)
      ResidentHome.tsx             ✦ placeholder (real overview in later milestones)
  services/
    api.ts                         ✦ Api interface
    index.ts                       ✦ exports `api` (the mock impl)
    hooks/                         (later: useProperties, useInvoices, ... query hooks)
    mock/
      index.ts                     ✦ assembles mock Api
      storage.ts                   ✦ namespaced localStorage helpers
      seed.ts                      ✦ idempotent fixture seeding
      fixtures.ts                  ✦ typed seed data (users for M1)
      authService.ts              ✦ mock auth implementation
  config/
    constants.ts                   ✦ notice period, booking limit, storage prefix, latency
  types/
    index.ts                       ✦ all shared interfaces (full data model)
  test/
    setup.ts                       ✦ jest-dom + per-test cleanup
    renderWithProviders.tsx        ✦ RTL helper wrapping providers + router
```

**Configuration files (repo root):** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore` — all created/edited in Task 0.

> **Naming convention:** path alias `@/` → `src/`. Use it in all non-relative imports (e.g. `import { api } from '@/services'`).

---

## Task 0: Project scaffold & tooling

We create config files explicitly (instead of the interactive `npm create vite`) because the directory already contains the spec, `docs/`, and `.git`, and the interactive scaffolder would prompt/hang.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/test/smoke.test.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "studhem",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@emotion/react": "^11.13.0",
    "@emotion/styled": "^11.13.0",
    "@hookform/resolvers": "^3.9.0",
    "@mui/icons-material": "^6.1.6",
    "@mui/material": "^6.1.6",
    "@mui/x-data-grid": "^7.22.0",
    "@mui/x-date-pickers": "^7.22.0",
    "@tanstack/react-query": "^5.59.0",
    "dayjs": "^1.11.13",
    "i18next": "^23.16.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-i18next": "^15.1.0",
    "react-router-dom": "^6.27.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.8.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom", "node"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StudHem</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

```gitignore
node_modules
dist
dist-ssr
*.local
.DS_Store
coverage
.vite
.claude/scheduled_tasks.lock
```

- [ ] **Step 6: Create entry + placeholder files**

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/app/App.tsx` (temporary placeholder, replaced in Task 11):
```tsx
export function App() {
  return <div>StudHem</div>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

`src/test/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('toolchain smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: completes, creates `node_modules` and `package-lock.json`, no peer-dependency errors that abort the install.

- [ ] **Step 8: Verify toolchain (test + typecheck)**

Run: `npm run test:run`
Expected: 1 passing test (`toolchain smoke`).

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore(m1): scaffold vite+ts+mui project with vitest toolchain"
```

---

## Task 1: Shared types (full data model)

**Files:**
- Create: `src/types/index.ts`
- Test: `src/types/types.test.ts`

- [ ] **Step 1: Write the failing test** (`src/types/types.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import type { User, Property, Booking, Contract } from '@/types';

describe('domain types', () => {
  it('compiles representative entities with v1 extensions', () => {
    const user: User = {
      id: 'u1', name: 'Test', email: 't@e.se', username: 'test',
      role: 'resident', password: 'x', status: 'active',
    };
    const property: Property = {
      id: 'p1', name: 'Rum 1', address: 'Gata 1', roomType: 'corridor room',
      rent: 4500, status: 'vacant', buildingId: 'b1',
    };
    const contract: Contract = {
      id: 'c1', propertyId: 'p1', residentId: 'u1', startDate: '2026-01-01',
      rent: 4500, terms: '...', status: 'active',
    };
    const booking: Booking = {
      id: 'bk1', facilityType: 'laundry', facilityId: 'f1',
      bookedById: 'u1', start: '2026-06-01T07:00:00Z', end: '2026-06-01T10:00:00Z',
    };
    expect([user.status, property.buildingId, contract.status, booking.facilityId])
      .toEqual(['active', 'b1', 'active', 'f1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/types`
Expected: FAIL — cannot find module `@/types`.

- [ ] **Step 3: Write `src/types/index.ts`**

```ts
export type Role = 'admin' | 'staff' | 'resident';
export type UserStatus = 'pending' | 'active';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  /** mock only: plaintext compare in the mock auth service, never in production */
  password: string;
  status: UserStatus;
}

/** User shape exposed to the UI — never carries the password. */
export type SafeUser = Omit<User, 'password'>;

export type PropertyStatus = 'vacant' | 'occupied';

export interface Property {
  id: string;
  name: string;
  address: string;
  roomType: string;
  rent: number;
  status: PropertyStatus;
  description?: string;
  residentId?: string;
  buildingId: string;
}

export type ContractStatus = 'active' | 'notice_given' | 'ended';

export interface Contract {
  id: string;
  propertyId: string;
  residentId: string;
  startDate: string;
  endDate?: string;
  rent: number;
  terms: string;
  status: ContractStatus;
  noticeGivenAt?: string;
}

export type MaintenanceStatus = 'received' | 'in_progress' | 'resolved';
export type MaintenanceCategory =
  | 'appliance' | 'plumbing' | 'electrical' | 'heating'
  | 'door_lock' | 'internet' | 'other';

export interface MaintenanceHistoryEntry {
  status: MaintenanceStatus;
  at: string;
  note?: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  residentId: string;
  category: MaintenanceCategory;
  description: string;
  photoUrls: string[];
  status: MaintenanceStatus;
  assignedTo?: string;
  createdAt: string;
  history: MaintenanceHistoryEntry[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  propertyId: string;
  participantIds: string[];
}

export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue';

export interface Invoice {
  id: string;
  contractId: string;
  period: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  paidAt?: string;
}

export type FacilityType = 'laundry' | 'common_room' | 'guest_room' | 'sauna';

export interface Facility {
  id: string;
  type: FacilityType;
  buildingId: string;
  label: string;
}

export interface Booking {
  id: string;
  facilityType: FacilityType;
  facilityId: string;
  bookedById: string;
  start: string;
  end: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'house_rules' | 'guide' | 'faq';
  url: string;
  language: 'sv' | 'en';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types
git commit -m "feat(m1): add shared domain types with v1 extensions"
```

---

## Task 2: Config constants

**Files:**
- Create: `src/config/constants.ts`
- Test: `src/config/constants.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/config`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/config/constants.ts`**

```ts
/** Minimum notice period (months) a resident must give before moving out. */
export const NOTICE_PERIOD_MONTHS = 2;

/** Max concurrent future bookings a resident may hold per facility type. */
export const MAX_FUTURE_BOOKINGS_PER_FACILITY = 2;

/** Namespace for all localStorage keys written by the mock service layer. */
export const STORAGE_PREFIX = 'studhem.v1.';

/** Simulated network latency (ms) for mock service calls. */
export const MOCK_LATENCY_MS = 300;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/config`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config
git commit -m "feat(m1): add configurable business-rule constants"
```

---

## Task 3: localStorage helper

**Files:**
- Create: `src/services/mock/storage.ts`
- Test: `src/services/mock/storage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readCollection, writeCollection } from '@/services/mock/storage';

interface Row { id: string; v: number }

describe('mock storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns the fallback when the key is empty', () => {
    expect(readCollection<Row>('rows', [{ id: 'a', v: 1 }])).toEqual([{ id: 'a', v: 1 }]);
  });

  it('round-trips a collection through namespaced localStorage', () => {
    writeCollection<Row>('rows', [{ id: 'b', v: 2 }]);
    expect(readCollection<Row>('rows', [])).toEqual([{ id: 'b', v: 2 }]);
    expect(localStorage.getItem('studhem.v1.rows')).not.toBeNull();
  });

  it('does not reuse the fallback once a value is written', () => {
    writeCollection<Row>('rows', []);
    expect(readCollection<Row>('rows', [{ id: 'x', v: 9 }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/services/mock/storage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/services/mock/storage.ts`**

```ts
import { STORAGE_PREFIX } from '@/config/constants';

const key = (name: string) => `${STORAGE_PREFIX}${name}`;

/** Reads a JSON collection; returns `fallback` only when the key is absent. */
export function readCollection<T>(name: string, fallback: T[]): T[] {
  const raw = localStorage.getItem(key(name));
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

export function writeCollection<T>(name: string, rows: T[]): void {
  localStorage.setItem(key(name), JSON.stringify(rows));
}

export function hasKey(name: string): boolean {
  return localStorage.getItem(key(name)) !== null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/services/mock/storage`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/mock/storage.ts src/services/mock/storage.test.ts
git commit -m "feat(m1): add namespaced localStorage collection helper"
```

---

## Task 4: Fixtures + idempotent seeding

**Files:**
- Create: `src/services/mock/fixtures.ts`
- Create: `src/services/mock/seed.ts`
- Test: `src/services/mock/seed.test.ts`

> M1 seeds only the `users` collection (auth is the only feature). Later milestones extend `fixtures.ts`/`seed.ts` with properties, contracts, etc.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { seedDatabase } from '@/services/mock/seed';
import { readCollection } from '@/services/mock/storage';
import type { User } from '@/types';

describe('seedDatabase', () => {
  beforeEach(() => localStorage.clear());

  it('seeds the demo users on first run', () => {
    seedDatabase();
    const users = readCollection<User>('users', []);
    expect(users.map((u) => u.username).sort()).toEqual(['admin', 'resident', 'staff']);
  });

  it('is idempotent and does not overwrite existing data', () => {
    seedDatabase();
    const users = readCollection<User>('users', []);
    users[0].name = 'EDITED';
    // simulate a prior write
    localStorage.setItem('studhem.v1.users', JSON.stringify(users));
    seedDatabase();
    const after = readCollection<User>('users', []);
    expect(after.find((u) => u.id === users[0].id)?.name).toBe('EDITED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/services/mock/seed`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/services/mock/fixtures.ts`**

```ts
import type { User } from '@/types';

export const userFixtures: User[] = [
  { id: 'u-admin', name: 'Anna Admin', email: 'anna@studhem.se', username: 'admin',
    role: 'admin', password: 'admin123', status: 'active' },
  { id: 'u-staff', name: 'Sven Staff', email: 'sven@studhem.se', username: 'staff',
    role: 'staff', password: 'staff123', status: 'active' },
  { id: 'u-res1', name: 'Rasmus Resident', email: 'rasmus@student.se', username: 'resident',
    role: 'resident', password: 'resident123', status: 'active' },
];
```

- [ ] **Step 4: Write `src/services/mock/seed.ts`**

```ts
import { hasKey, writeCollection } from './storage';
import { userFixtures } from './fixtures';

/** Seeds each collection only if it has never been written. Safe to call on every boot. */
export function seedDatabase(): void {
  if (!hasKey('users')) writeCollection('users', userFixtures);
  // later milestones: properties, buildings, facilities, contracts, invoices, etc.
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/services/mock/seed`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/mock/fixtures.ts src/services/mock/seed.ts src/services/mock/seed.test.ts
git commit -m "feat(m1): add user fixtures and idempotent db seeding"
```

---

## Task 5: Api interface + mock auth service

**Files:**
- Create: `src/services/api.ts`
- Create: `src/services/mock/authService.ts`
- Create: `src/services/mock/index.ts`
- Create: `src/services/index.ts`
- Test: `src/services/mock/authService.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';

describe('mock auth service', () => {
  beforeEach(() => localStorage.clear());

  it('logs in a valid user and never returns the password', async () => {
    const user = await api.auth.login('admin', 'admin123');
    expect(user.role).toBe('admin');
    expect((user as Record<string, unknown>).password).toBeUndefined();
  });

  it('rejects a wrong password', async () => {
    await expect(api.auth.login('admin', 'nope')).rejects.toThrow();
  });

  it('rejects an unknown username', async () => {
    await expect(api.auth.login('ghost', 'x')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/services/mock/authService`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/services/api.ts`**

```ts
import type { SafeUser } from '@/types';

export interface AuthApi {
  login(username: string, password: string): Promise<SafeUser>;
}

/** The backend contract. Mock impl today; a REST impl can replace it later. */
export interface Api {
  auth: AuthApi;
}
```

- [ ] **Step 4: Write `src/services/mock/authService.ts`**

```ts
import type { AuthApi } from '@/services/api';
import type { User } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { readCollection } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class AuthError extends Error {}

export function createAuthService(): AuthApi {
  return {
    async login(username, password) {
      await delay(MOCK_LATENCY_MS);
      const users = readCollection<User>('users', []);
      const match = users.find((u) => u.username === username);
      if (!match || match.password !== password) {
        throw new AuthError('invalid_credentials');
      }
      const { password: _omit, ...safe } = match;
      return safe;
    },
  };
}
```

- [ ] **Step 5: Write `src/services/mock/index.ts`**

```ts
import type { Api } from '@/services/api';
import { seedDatabase } from './seed';
import { createAuthService } from './authService';

export function createMockApi(): Api {
  seedDatabase();
  return {
    auth: createAuthService(),
  };
}
```

- [ ] **Step 6: Write `src/services/index.ts`**

```ts
import type { Api } from './api';
import { createMockApi } from './mock';

/** Single app-wide service handle. Swap `createMockApi()` for a REST impl later. */
export const api: Api = createMockApi();
export type { Api } from './api';
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test:run -- src/services/mock/authService`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add src/services
git commit -m "feat(m1): add Api interface and localStorage-backed mock auth service"
```

---

## Task 6: Theme + color-mode context

**Files:**
- Create: `src/theme/theme.ts`
- Create: `src/theme/ColorModeContext.tsx`
- Test: `src/theme/ColorModeContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorModeProvider, useColorMode } from '@/theme/ColorModeContext';

function Probe() {
  const { mode, toggle } = useColorMode();
  return <button onClick={toggle}>mode:{mode}</button>;
}

describe('ColorModeContext', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to light and toggles to dark, persisting the choice', async () => {
    render(<ColorModeProvider><Probe /></ColorModeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('mode:light');
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('mode:dark');
    expect(localStorage.getItem('studhem.v1.colorMode')).toBe('dark');
  });

  it('reads the persisted mode on init', () => {
    localStorage.setItem('studhem.v1.colorMode', 'dark');
    render(<ColorModeProvider><Probe /></ColorModeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('mode:dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/theme/ColorModeContext`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/theme/theme.ts`**

```ts
import { createTheme, type Theme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark';

export function buildTheme(mode: ColorMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#1565c0' },   // calm, trustworthy deep blue
      secondary: { main: '#00897b' }, // teal accent
      success: { main: '#2e7d32' },
      warning: { main: '#ed6c02' },
      error: { main: '#d32f2f' },
      info: { main: '#0288d1' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'Roboto, system-ui, Arial, sans-serif',
    },
  });
}
```

- [ ] **Step 4: Write `src/theme/ColorModeContext.tsx`**

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { buildTheme, type ColorMode } from './theme';
import { STORAGE_PREFIX } from '@/config/constants';

const MODE_KEY = `${STORAGE_PREFIX}colorMode`;

interface ColorModeContextValue {
  mode: ColorMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function initialMode(): ColorMode {
  return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light';
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(initialMode);

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem(MODE_KEY, next);
          return next;
        }),
    }),
    [mode],
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/theme/ColorModeContext`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/theme
git commit -m "feat(m1): add MUI theme and persisted light/dark color-mode context"
```

---

## Task 7: i18n (sv default / en fallback)

**Files:**
- Create: `src/i18n/index.ts`
- Create: `src/i18n/locales/sv.json`
- Create: `src/i18n/locales/en.json`
- Test: `src/i18n/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';

describe('i18n', () => {
  it('defaults to Swedish', () => {
    expect(i18n.language).toBe('sv');
    expect(i18n.t('login.title')).toBe('Logga in');
  });

  it('switches to English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('login.title')).toBe('Sign in');
    await i18n.changeLanguage('sv'); // reset for other tests
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/i18n`
Expected: FAIL — module not found.

- [ ] **Step 3: Write locale files**

`src/i18n/locales/sv.json`:
```json
{
  "app": { "name": "StudHem" },
  "common": { "logout": "Logga ut", "language": "Språk", "theme": "Tema" },
  "login": {
    "title": "Logga in",
    "username": "Användarnamn",
    "password": "Lösenord",
    "submit": "Logga in",
    "error": "Fel användarnamn eller lösenord",
    "demoHeading": "Demo-inloggningar"
  },
  "nav": { "admin": "Adminpanel", "home": "Hem" }
}
```

`src/i18n/locales/en.json`:
```json
{
  "app": { "name": "StudHem" },
  "common": { "logout": "Sign out", "language": "Language", "theme": "Theme" },
  "login": {
    "title": "Sign in",
    "username": "Username",
    "password": "Password",
    "submit": "Sign in",
    "error": "Wrong username or password",
    "demoHeading": "Demo logins"
  },
  "nav": { "admin": "Admin panel", "home": "Home" }
}
```

- [ ] **Step 4: Write `src/i18n/index.ts`**

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import sv from './locales/sv.json';
import en from './locales/en.json';
import { STORAGE_PREFIX } from '@/config/constants';

const LANG_KEY = `${STORAGE_PREFIX}lang`;
const stored = localStorage.getItem(LANG_KEY);
const initialLang = stored === 'en' ? 'en' : 'sv';

void i18n.use(initReactI18next).init({
  resources: { sv: { translation: sv }, en: { translation: en } },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => localStorage.setItem(LANG_KEY, lng));

export default i18n;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/i18n`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/i18n
git commit -m "feat(m1): add i18next with sv default and en fallback"
```

---

## Task 8: Auth paths + AuthContext

**Files:**
- Create: `src/auth/paths.ts`
- Create: `src/auth/AuthContext.tsx`
- Test: `src/auth/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/auth/AuthContext';

function Probe() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="who">{user ? `${user.username}:${user.role}` : 'none'}</span>
      <button onClick={() => login('admin', 'admin123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear());

  it('logs in, exposes the user, and persists the session', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('who')).toHaveTextContent('none');
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('admin:admin'));
    expect(localStorage.getItem('studhem.v1.session')).toContain('admin');
  });

  it('restores the session on mount', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' }),
    );
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('who')).toHaveTextContent('admin:admin');
  });

  it('clears the session on logout', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('admin:admin'));
    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('who')).toHaveTextContent('none');
    expect(localStorage.getItem('studhem.v1.session')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/auth/AuthContext`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/auth/paths.ts`**

```ts
import type { Role } from '@/types';

/** The landing route for a given role. */
export function homePathFor(role: Role): string {
  return role === 'resident' ? '/home' : '/admin';
}
```

- [ ] **Step 4: Write `src/auth/AuthContext.tsx`**

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

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/auth/AuthContext`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/auth/paths.ts src/auth/AuthContext.tsx src/auth/AuthContext.test.tsx
git commit -m "feat(m1): add mock AuthContext with session persistence"
```

---

## Task 9: Test helper (renderWithProviders)

**Files:**
- Create: `src/test/renderWithProviders.tsx`

> No test of its own — exercised by Tasks 10–11. Keep it minimal and provider-complete.

- [ ] **Step 1: Write `src/test/renderWithProviders.tsx`**

```tsx
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { ColorModeProvider } from '@/theme/ColorModeContext';
import { AuthProvider } from '@/auth/AuthContext';
import i18n from '@/i18n';

interface Options {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, { route = '/' }: Options = {}): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ColorModeProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </AuthProvider>
        </ColorModeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/test/renderWithProviders.tsx
git commit -m "test(m1): add renderWithProviders RTL helper"
```

---

## Task 10: Route guards

**Files:**
- Create: `src/auth/guards.tsx`
- Test: `src/auth/guards.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequireAuth, RequireRole } from '@/auth/guards';

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<div>LOGIN</div>} />
      <Route path="/home" element={<div>RESIDENT HOME</div>} />
      <Route
        path="/admin"
        element={<RequireRole roles={['admin', 'staff']}><div>ADMIN</div></RequireRole>}
      />
      <Route
        path="/secret"
        element={<RequireAuth><div>SECRET</div></RequireAuth>}
      />
    </Routes>
  );
}

describe('route guards', () => {
  beforeEach(() => localStorage.clear());

  it('redirects an unauthenticated user to /login', () => {
    renderWithProviders(<Tree />, { route: '/secret' });
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('blocks a resident from an admin route and sends them to their home', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' }),
    );
    renderWithProviders(<Tree />, { route: '/admin' });
    expect(screen.getByText('RESIDENT HOME')).toBeInTheDocument();
  });

  it('allows an admin into an admin route', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' }),
    );
    renderWithProviders(<Tree />, { route: '/admin' });
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/auth/guards`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/auth/guards.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/types';
import { useAuth } from './AuthContext';
import { homePathFor } from './paths';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

/** Sends "/" and unknown routes to the right place based on auth state. */
export function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/auth/guards`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/auth/guards.tsx src/auth/guards.test.tsx
git commit -m "feat(m1): add RequireAuth/RequireRole route guards"
```

---

## Task 11: Login page + placeholder home pages

**Files:**
- Create: `src/features/auth/LoginPage.tsx`
- Create: `src/features/dashboard/AdminDashboard.tsx`
- Create: `src/features/dashboard/ResidentHome.tsx`
- Test: `src/features/auth/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from '@/features/auth/LoginPage';

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<div>ADMIN DASHBOARD</div>} />
      <Route path="/home" element={<div>RESIDENT HOME</div>} />
    </Routes>
  );
}

describe('LoginPage', () => {
  beforeEach(() => localStorage.clear());

  it('logs an admin in and redirects to the admin dashboard', async () => {
    renderWithProviders(<Tree />, { route: '/login' });
    await userEvent.type(screen.getByLabelText(/användarnamn/i), 'admin');
    await userEvent.type(screen.getByLabelText(/lösenord/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /logga in/i }));
    await waitFor(() => expect(screen.getByText('ADMIN DASHBOARD')).toBeInTheDocument());
  });

  it('shows an error on bad credentials', async () => {
    renderWithProviders(<Tree />, { route: '/login' });
    await userEvent.type(screen.getByLabelText(/användarnamn/i), 'admin');
    await userEvent.type(screen.getByLabelText(/lösenord/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /logga in/i }));
    await waitFor(() =>
      expect(screen.getByText(/fel användarnamn eller lösenord/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/features/auth/LoginPage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the placeholder home pages**

`src/features/dashboard/AdminDashboard.tsx`:
```tsx
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

export function AdminDashboard() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">{t('nav.admin')}</Typography>
    </Box>
  );
}
```

`src/features/dashboard/ResidentHome.tsx`:
```tsx
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

export function ResidentHome() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">{t('nav.home')}</Typography>
    </Box>
  );
}
```

- [ ] **Step 4: Write `src/features/auth/LoginPage.tsx`**

```tsx
import { useState } from 'react';
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
import { homePathFor } from '@/auth/paths';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setError(false);
    try {
      const user = await login(username, password);
      navigate(homePathFor(user.role), { replace: true });
    } catch {
      setError(true);
    }
  });

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 3 }}>{t('login.title')}</Typography>
          <form onSubmit={onSubmit} noValidate>
            <Stack sx={{ gap: 2 }}>
              {error && <Alert severity="error">{t('login.error')}</Alert>}
              <TextField
                label={t('login.username')}
                autoComplete="username"
                {...register('username')}
              />
              <TextField
                label={t('login.password')}
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
                {t('login.submit')}
              </Button>
            </Stack>
          </form>
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              {t('login.demoHeading')}: admin / admin123 · resident / resident123
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
```

> **Note on `TextField` + `register` + label association:** MUI associates the label via a generated `id`/`htmlFor`, so `getByLabelText` works. If a future RTL query fails to find the input by label, add an explicit `id` and `htmlFor`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/features/auth/LoginPage`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/LoginPage.tsx src/features/auth/LoginPage.test.tsx src/features/dashboard
git commit -m "feat(m1): add login page with demo credentials and placeholder home pages"
```

---

## Task 12: Routes + providers + App composition

**Files:**
- Create: `src/app/routes.tsx`
- Create: `src/app/providers.tsx`
- Modify: `src/app/App.tsx` (replace placeholder)
- Test: `src/app/routes.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from '@/app/routes';

describe('AppRoutes', () => {
  beforeEach(() => localStorage.clear());

  it('redirects an unknown route to /login when logged out', async () => {
    renderWithProviders(<AppRoutes />, { route: '/totally-unknown' });
    await waitFor(() => expect(screen.getByText(/logga in/i)).toBeInTheDocument());
  });

  it('lands an admin on the admin dashboard', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' }),
    );
    renderWithProviders(<AppRoutes />, { route: '/admin' });
    expect(screen.getByText(/adminpanel/i)).toBeInTheDocument();
  });

  it('lands a resident on resident home', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' }),
    );
    renderWithProviders(<AppRoutes />, { route: '/home' });
    expect(screen.getByText(/^hem$/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/routes`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/app/routes.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { RequireRole, RootRedirect } from '@/auth/guards';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={<RequireRole roles={['admin', 'staff']}><AdminDashboard /></RequireRole>}
      />
      <Route
        path="/home"
        element={<RequireRole roles={['resident']}><ResidentHome /></RequireRole>}
      />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Write `src/app/providers.tsx`**

```tsx
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/sv';
import { ColorModeProvider } from '@/theme/ColorModeContext';
import { AuthProvider } from '@/auth/AuthContext';
import i18n from '@/i18n';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="sv">
            <AuthProvider>{children}</AuthProvider>
          </LocalizationProvider>
        </ColorModeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Replace `src/app/App.tsx`**

```tsx
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:run -- src/app/routes`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app
git commit -m "feat(m1): compose providers, routing, and app root"
```

---

## Task 13: Milestone verification & gate

- [ ] **Step 1: Full test suite green**

Run: `npm run test:run`
Expected: all tests pass (types, constants, storage, seed, authService, ColorMode, i18n, AuthContext, guards, LoginPage, routes, smoke).

- [ ] **Step 2: Typecheck clean**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Production build succeeds**

Run: `npm run build`
Expected: build completes, emits `dist/`.

- [ ] **Step 4: Manual dev-server smoke (no console errors)**

Run: `npm run dev`, open the printed URL.
Verify, with the browser console open (must be free of errors):
- Visiting `/` redirects to `/login`.
- Logging in as `admin` / `admin123` lands on the admin panel; logging out returns to `/login`.
- Logging in as `resident` / `resident123` lands on resident home.
- While logged in as resident, manually visiting `/admin` redirects back to `/home`.
- The theme is applied (rounded corners, primary blue). Data persists: refresh keeps you logged in.

Stop the dev server when done.

- [ ] **Step 5: Acceptance check against the spec**

Confirm Milestone 1 acceptance (spec §9.1 + §10): app builds/runs with no console or TS errors; admin login → admin dashboard; resident login → resident home; guards block cross-role access; light/dark theme present; mock `AuthContext` with login + guards working.

- [ ] **Step 6: Final milestone commit (if any uncommitted changes remain)**

```bash
git add -A
git commit -m "chore(m1): milestone 1 (scaffold) complete — login, guards, theme, i18n, mock services"
```

---

## Definition of done (Milestone 1)

- All tasks' tests pass; `npm run test:run`, `npm run typecheck`, and `npm run build` are green.
- An admin and a resident fixture can log in and reach their role home; cross-role access is blocked; unknown routes redirect correctly.
- Theme (light/dark, borderRadius 12, semantic palette) and i18n (sv default, en fallback) are wired and persisted in localStorage.
- The mock service layer is reachable only via the `Api` interface; data is seeded into and read from localStorage.
- No raw pixel spacing in components (use `sx` + theme spacing); strings come from i18n; colors/typography from the theme.
