# Student Housing App — Milestone 5 (Economy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface monthly rent invoices for residents (with a mock pay action) and admins (with status filtering, totals, and a mock send-reminder action), wire the "unpaid rent" card on the dashboard to live data, and align invoice status colors with the shared `StatusChip`.

**Architecture:** Add `economy` to the mock `Api` — list, byContractId, byResidentId, markPaid, sendReminder (no-op). Status derivation is centralized: when a query returns invoices, compute the effective `status` from `dueDate` vs today so `unpaid` becomes `overdue` after the due date elapses (the stored value is the floor; tests assert the derived value). Reuse `StatusChip` (already supports `invoice` kind), `DataGrid`, and TanStack Query patterns.

**Tech Stack:** No new deps.

---

## Plan series context

This is **plan 5 of 8**. Previous: M1–M4. Authoritative references: base spec + design doc as before.

### Scope clarifications

- **Mock pay** flips `status → paid` and sets `paidAt`. No real payment integration.
- **Mock reminder** is a no-op service call that resolves with a marker so we can show a Snackbar; nothing changes in the data model. (Reminder realism is deferred per design §7.)
- **Status derivation**: invoices stored with `status: 'unpaid'` are reported as `'overdue'` by the service when `dueDate < today` (lexical compare on ISO `YYYY-MM-DD` is correct). Once `paid`, that wins.
- **Dashboard "Unpaid rent" card** shows the count of invoices whose effective status is **not paid**.
- **OCR reference numbers / late fees / payment receipts**: deferred (design §7).
- **Resident rent page** lists their own invoices and exposes pay actions for unpaid/overdue rows. Paying refreshes the list.

---

## File structure map (M5 additions)

```
src/
  app/routes.tsx                                  ✦ adds /admin/economy, /rent
  components/AdminLayout.tsx                      ✦ adds Ekonomi nav entry
  components/ResidentLayout.tsx                   ✦ adds Hyra tab
  features/economy/
    AdminEconomyPage.tsx                          ✦
    ResidentRentPage.tsx                          ✦
    AdminEconomyPage.test.tsx                     ✦
    ResidentRentPage.test.tsx                     ✦
  features/dashboard/AdminDashboard.tsx           ✦ wires unpaid count
  services/
    api.ts                                        ✦ adds EconomyApi
    hooks/queryKeys.ts                            ✦ adds invoice keys
    hooks/economy.ts                              ✦
    mock/fixtures.ts                              ✦ invoice fixtures
    mock/seed.ts                                  ✦
    mock/economyService.ts                        ✦ + status derivation
    mock/economyService.test.ts                   ✦
    mock/index.ts                                 ✦
  i18n/locales/sv.json, en.json                   ✦ adds economy.* / nav.economy / nav.rent
```

---

## Task 0: Invoice fixtures + seed

**Files:**
- Modify: `src/services/mock/fixtures.ts`
- Modify: `src/services/mock/seed.ts`
- Modify: `src/services/mock/seed.test.ts`

> Seed 4 invoices: a paid one (past), an unpaid one (current month, not yet due), an unpaid one with a due date in the past (will surface as overdue), and one for Rebecka. Using mid-2026 dates so the "unpaid past-due → overdue" derivation has a concrete fixture to test.

- [ ] **Step 1: Add invoice fixtures**

In `src/services/mock/fixtures.ts` append:

```ts
export const invoiceFixtures: Invoice[] = [
  {
    id: 'inv-1', contractId: 'c-1', period: '2026-03',
    amount: 4200, dueDate: '2026-03-31',
    status: 'paid', paidAt: '2026-03-25T10:00:00Z',
  },
  {
    id: 'inv-2', contractId: 'c-1', period: '2026-04',
    amount: 4200, dueDate: '2026-04-30',
    status: 'unpaid',
  },
  {
    id: 'inv-3', contractId: 'c-1', period: '2026-06',
    amount: 4200, dueDate: '2026-06-30',
    status: 'unpaid',
  },
  {
    id: 'inv-4', contractId: 'c-2', period: '2026-06',
    amount: 4200, dueDate: '2026-06-30',
    status: 'unpaid',
  },
];
```

Update imports:

```ts
import type {
  Building, Contract, Conversation, Facility, Invoice, MaintenanceRequest,
  Message, Property, User,
} from '@/types';
```

- [ ] **Step 2: Update `seed.ts`**

```ts
import { hasKey, writeCollection } from './storage';
import {
  buildingFixtures, contractFixtures, conversationFixtures, facilityFixtures,
  invoiceFixtures, maintenanceFixtures, messageFixtures, propertyFixtures,
  userFixtures,
} from './fixtures';

export function seedDatabase(): void {
  if (!hasKey('users')) writeCollection('users', userFixtures);
  if (!hasKey('buildings')) writeCollection('buildings', buildingFixtures);
  if (!hasKey('properties')) writeCollection('properties', propertyFixtures);
  if (!hasKey('contracts')) writeCollection('contracts', contractFixtures);
  if (!hasKey('facilities')) writeCollection('facilities', facilityFixtures);
  if (!hasKey('maintenance')) writeCollection('maintenance', maintenanceFixtures);
  if (!hasKey('conversations')) writeCollection('conversations', conversationFixtures);
  if (!hasKey('messages')) writeCollection('messages', messageFixtures);
  if (!hasKey('invoices')) writeCollection('invoices', invoiceFixtures);
}
```

- [ ] **Step 3: Extend `seed.test.ts`**

Append:

```ts
import type { Invoice } from '@/types';
// (Invoice import goes alongside existing types)

describe('seedDatabase (economy)', () => {
  beforeEach(() => localStorage.clear());

  it('seeds invoices covering paid and unpaid', () => {
    seedDatabase();
    const rows = readCollection<Invoice>('invoices', []);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.status === 'paid')).toBe(true);
    expect(rows.some((r) => r.status === 'unpaid')).toBe(true);
  });
});
```

- [ ] **Step 4: Tests + typecheck**

Run: `npx vitest run src/services/mock/seed`
Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/services/mock/fixtures.ts src/services/mock/seed.ts src/services/mock/seed.test.ts
git commit -m "feat(m5): seed monthly rent invoices (paid + unpaid)"
```

---

## Task 1: EconomyApi + mock service (with status derivation)

**Files:**
- Modify: `src/services/api.ts`
- Create: `src/services/mock/economyService.ts`
- Create: `src/services/mock/economyService.test.ts`
- Modify: `src/services/mock/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('economy service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    // Fix "today" so overdue derivation is deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('list returns every seeded invoice', async () => {
    const rows = await api.economy.list();
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('derives overdue when an unpaid invoice is past its dueDate', async () => {
    const inv = (await api.economy.list()).find((r) => r.id === 'inv-2');
    expect(inv?.status).toBe('overdue'); // dueDate 2026-04-30 < today 2026-05-15
  });

  it('keeps an unpaid invoice unpaid when dueDate is in the future', async () => {
    const inv = (await api.economy.list()).find((r) => r.id === 'inv-3');
    expect(inv?.status).toBe('unpaid'); // dueDate 2026-06-30 > today
  });

  it('byResident returns only invoices for that resident\'s contracts', async () => {
    const rows = await api.economy.byResident('u-res1');
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.every((r) => r.contractId === 'c-1')).toBe(true);
  });

  it('markPaid transitions to paid and sets paidAt', async () => {
    const before = await api.economy.list();
    const target = before.find((r) => r.id === 'inv-3')!;
    expect(target.status).toBe('unpaid');

    const updated = await api.economy.markPaid('inv-3');
    expect(updated.status).toBe('paid');
    expect(updated.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const after = (await api.economy.list()).find((r) => r.id === 'inv-3')!;
    expect(after.status).toBe('paid');
  });

  it('sendReminder resolves without mutating state', async () => {
    const before = JSON.stringify(await api.economy.list());
    await api.economy.sendReminder('inv-2');
    const after = JSON.stringify(await api.economy.list());
    expect(after).toBe(before);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/services/mock/economyService`
Expected: FAIL — `api.economy` undefined.

- [ ] **Step 3: Extend `src/services/api.ts`**

Replace the imports + add `EconomyApi`, slot on `Api`:

```ts
import type {
  Contract, Conversation, Invoice, MaintenanceCategory, MaintenanceRequest,
  MaintenanceStatus, Message, Property, SafeUser,
} from '@/types';

// existing AuthApi/PropertiesApi/ContractsApi/UsersApi/MaintenanceApi/ChatApi unchanged

export interface EconomyApi {
  list(): Promise<Invoice[]>;
  byContractId(contractId: string): Promise<Invoice[]>;
  byResident(residentId: string): Promise<Invoice[]>;
  markPaid(invoiceId: string): Promise<Invoice>;
  /** Mock no-op — resolves after latency. */
  sendReminder(invoiceId: string): Promise<void>;
}

export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
  maintenance: MaintenanceApi;
  chat: ChatApi;
  economy: EconomyApi;
}
```

- [ ] **Step 4: Write `src/services/mock/economyService.ts`**

```ts
import type { EconomyApi } from '@/services/api';
import type { Contract, Invoice } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function deriveStatus(row: Invoice, todayDate: string): Invoice {
  if (row.status === 'paid') return row;
  if (row.dueDate < todayDate) return { ...row, status: 'overdue' };
  return row;
}

export function createEconomyService(): EconomyApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      const todayDate = today();
      return readCollection<Invoice>('invoices', []).map((r) => deriveStatus(r, todayDate));
    },
    async byContractId(contractId) {
      await delay(MOCK_LATENCY_MS);
      const todayDate = today();
      return readCollection<Invoice>('invoices', [])
        .filter((r) => r.contractId === contractId)
        .map((r) => deriveStatus(r, todayDate));
    },
    async byResident(residentId) {
      await delay(MOCK_LATENCY_MS);
      const todayDate = today();
      const contractIds = new Set(
        readCollection<Contract>('contracts', [])
          .filter((c) => c.residentId === residentId)
          .map((c) => c.id),
      );
      return readCollection<Invoice>('invoices', [])
        .filter((r) => contractIds.has(r.contractId))
        .map((r) => deriveStatus(r, todayDate));
    },
    async markPaid(invoiceId) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Invoice>('invoices', invoiceId);
      if (!existing) throw new Error(`invoice_not_found:${invoiceId}`);
      const updated: Invoice = {
        ...existing,
        status: 'paid',
        paidAt: new Date().toISOString(),
      };
      upsertById<Invoice>('invoices', updated);
      return updated;
    },
    async sendReminder(_invoiceId) {
      await delay(MOCK_LATENCY_MS);
      // intentional no-op
    },
  };
}
```

- [ ] **Step 5: Wire into `src/services/mock/index.ts`**

```ts
import { createEconomyService } from './economyService';
// ...
return {
  // ...existing,
  economy: createEconomyService(),
};
```

- [ ] **Step 6: Tests + typecheck**

Run: `npx vitest run src/services/mock/economyService`
Run: `npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add src/services
git commit -m "feat(m5): add economy mock service with derived overdue status"
```

---

## Task 2: Query hooks + i18n keys

**Files:**
- Modify: `src/services/hooks/queryKeys.ts`
- Create: `src/services/hooks/economy.ts`
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json`

- [ ] **Step 1: Extend `queryKeys.ts`**

```ts
  invoices: () => ['invoices'] as const,
  invoicesByResident: (residentId: string) => ['invoices', 'byResident', residentId] as const,
```

- [ ] **Step 2: Write `src/services/hooks/economy.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useInvoices() {
  return useQuery({ queryKey: keys.invoices(), queryFn: () => api.economy.list() });
}

export function useInvoicesByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId
      ? keys.invoicesByResident(residentId)
      : ['invoices', 'byResident', 'none'],
    queryFn: () => api.economy.byResident(residentId as string),
    enabled: Boolean(residentId),
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => api.economy.markPaid(invoiceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useSendReminder() {
  return useMutation({
    mutationFn: (invoiceId: string) => api.economy.sendReminder(invoiceId),
  });
}
```

- [ ] **Step 3: Add i18n**

Inside `sv.json` root:

```json
"economy": {
  "title": "Ekonomi",
  "myTitle": "Min hyra",
  "period": "Period",
  "amount": "Belopp",
  "dueDate": "Förfallodatum",
  "status": "Status",
  "paid": "Betald",
  "pay": "Betala",
  "sendReminder": "Skicka påminnelse",
  "reminderSent": "Påminnelse skickad",
  "totalUnpaid": "Obetalt totalt",
  "all": "Alla",
  "filterStatus": "Status",
  "empty": "Inga fakturor"
},
```

And inside `nav`: add `"economy": "Ekonomi", "rent": "Hyra"`.

`en.json` mirror:

```json
"economy": {
  "title": "Economy",
  "myTitle": "My rent",
  "period": "Period",
  "amount": "Amount",
  "dueDate": "Due date",
  "status": "Status",
  "paid": "Paid",
  "pay": "Pay",
  "sendReminder": "Send reminder",
  "reminderSent": "Reminder sent",
  "totalUnpaid": "Unpaid total",
  "all": "All",
  "filterStatus": "Status",
  "empty": "No invoices"
},
```

And inside `nav`: `"economy": "Economy", "rent": "Rent"`.

- [ ] **Step 4: Tests + typecheck**

Run: `npx vitest run src/services`
Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/services/hooks src/i18n
git commit -m "feat(m5): add economy query hooks and i18n keys"
```

---

## Task 3: AdminEconomyPage

**Files:**
- Create: `src/features/economy/AdminEconomyPage.tsx`
- Create: `src/features/economy/AdminEconomyPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminEconomyPage } from '@/features/economy/AdminEconomyPage';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminEconomyPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('lists every seeded invoice with its status chip', async () => {
    renderWithProviders(<AdminEconomyPage />, { route: '/admin/economy' });
    await waitFor(() => expect(screen.getByText('2026-03')).toBeInTheDocument());
    expect(screen.getByText('2026-04')).toBeInTheDocument();
    expect(screen.getByText('2026-06')).toBeInTheDocument();
  });

  it('shows the unpaid + overdue total', async () => {
    renderWithProviders(<AdminEconomyPage />, { route: '/admin/economy' });
    // 3 unpaid invoices × 4200 = 12600
    await waitFor(() =>
      expect(screen.getByText(/obetalt totalt/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/12 ?600/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/economy/AdminEconomyPage`
Expected: FAIL.

- [ ] **Step 3: Write `src/features/economy/AdminEconomyPage.tsx`**

```tsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import type { Invoice } from '@/types';
import { StatusChip } from '@/components/StatusChip';
import { useInvoices, useSendReminder } from '@/services/hooks/economy';
import { useProperties } from '@/services/hooks/properties';
import { useUsers } from '@/services/hooks/users';

interface ContractContext {
  propertyName?: string;
  residentName?: string;
}

export function AdminEconomyPage() {
  const { t } = useTranslation();
  const invoices = useInvoices();
  const properties = useProperties();
  const users = useUsers();
  const reminder = useSendReminder();
  const [snack, setSnack] = useState(false);

  // Compose contract → property + resident lookup via existing collections
  const propertyByContract = useMemo(() => {
    const map = new Map<string, ContractContext>();
    const usersById = new Map(users.data?.map((u) => [u.id, u]) ?? []);
    const propertiesById = new Map(properties.data?.map((p) => [p.id, p]) ?? []);
    // contracts are seeded in the mock; pull through window.localStorage to avoid a new hook
    const contracts: Array<{ id: string; propertyId: string; residentId: string }> =
      JSON.parse(localStorage.getItem('studhem.v1.contracts') || '[]');
    for (const c of contracts) {
      map.set(c.id, {
        propertyName: propertiesById.get(c.propertyId)?.name,
        residentName: usersById.get(c.residentId)?.name,
      });
    }
    return map;
  }, [properties.data, users.data]);

  const rows = invoices.data ?? [];
  const unpaidTotal = rows
    .filter((r) => r.status !== 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const columns: GridColDef<Invoice>[] = [
    { field: 'period', headerName: t('economy.period'), width: 120 },
    {
      field: 'property',
      headerName: t('maintenance.property'),
      flex: 1,
      renderCell: (p) => propertyByContract.get(p.row.contractId)?.propertyName ?? p.row.contractId,
      sortable: false,
    },
    {
      field: 'resident',
      headerName: t('maintenance.resident'),
      flex: 1,
      renderCell: (p) => propertyByContract.get(p.row.contractId)?.residentName ?? '—',
      sortable: false,
    },
    {
      field: 'amount',
      headerName: t('economy.amount'),
      width: 120,
      valueFormatter: (value: number) => `${value} kr`,
    },
    { field: 'dueDate', headerName: t('economy.dueDate'), width: 140 },
    {
      field: 'status',
      headerName: t('economy.status'),
      width: 140,
      renderCell: (p) => <StatusChip kind="invoice" value={p.row.status} />,
    },
    {
      field: 'actions',
      headerName: ' ',
      width: 220,
      sortable: false,
      filterable: false,
      renderCell: (p) =>
        p.row.status !== 'paid' ? (
          <Button
            size="small"
            onClick={async () => {
              await reminder.mutateAsync(p.row.id);
              setSnack(true);
            }}
          >
            {t('economy.sendReminder')}
          </Button>
        ) : null,
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('economy.title')}</Typography>
        <Typography variant="overline" color="text.secondary">
          {t('economy.totalUnpaid')}:&nbsp;
          <Typography component="span" variant="h6">{unpaidTotal} kr</Typography>
        </Typography>
      </Stack>
      {invoices.isLoading
        ? <Skeleton variant="rectangular" height={400} />
        : <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            localeText={rows.length === 0 ? { noRowsLabel: t('economy.empty') } : undefined}
          />}
      <Snackbar
        open={snack}
        autoHideDuration={2500}
        onClose={() => setSnack(false)}
        message={t('economy.reminderSent')}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/economy/AdminEconomyPage`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/economy/AdminEconomyPage.tsx src/features/economy/AdminEconomyPage.test.tsx
git commit -m "feat(m5): add admin economy page with invoice DataGrid and unpaid total"
```

---

## Task 4: ResidentRentPage

**Files:**
- Create: `src/features/economy/ResidentRentPage.tsx`
- Create: `src/features/economy/ResidentRentPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentRentPage } from '@/features/economy/ResidentRentPage';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentRentPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('lists only this resident\'s invoices', async () => {
    renderWithProviders(<ResidentRentPage />, { route: '/rent' });
    await waitFor(() => expect(screen.getByText('2026-03')).toBeInTheDocument());
    expect(screen.getByText('2026-04')).toBeInTheDocument();
    expect(screen.getByText('2026-06')).toBeInTheDocument();
    // Rebecka's invoice (inv-4) is for c-2, hidden
    expect(screen.queryAllByText('2026-06').length).toBe(1);
  });

  it('pays an unpaid invoice and flips it to paid', async () => {
    renderWithProviders(<ResidentRentPage />, { route: '/rent' });
    await waitFor(() => expect(screen.getByText('2026-06')).toBeInTheDocument());
    // pay the future-dated unpaid invoice (inv-3)
    const buttons = screen.getAllByRole('button', { name: /^betala$/i });
    await userEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      const stillUnpaid = screen.queryAllByRole('button', { name: /^betala$/i });
      expect(stillUnpaid.length).toBe(buttons.length - 1);
    });
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/economy/ResidentRentPage`
Expected: FAIL.

- [ ] **Step 3: Write `src/features/economy/ResidentRentPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import type { Invoice } from '@/types';
import { StatusChip } from '@/components/StatusChip';
import { useAuth } from '@/auth/AuthContext';
import { useInvoicesByResident, useMarkInvoicePaid } from '@/services/hooks/economy';

export function ResidentRentPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const invoices = useInvoicesByResident(user?.id);
  const pay = useMarkInvoicePaid();

  function sorted(rows: Invoice[]) {
    return [...rows].sort((a, b) => b.period.localeCompare(a.period));
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('economy.myTitle')}</Typography>
      {invoices.isLoading
        ? <Skeleton variant="rectangular" height={300} />
        : (
          <Stack sx={{ gap: 1 }}>
            {(invoices.data?.length ?? 0) === 0 && (
              <Typography color="text.secondary">{t('economy.empty')}</Typography>
            )}
            {sorted(invoices.data ?? []).map((row) => (
              <Card key={row.id}>
                <CardContent>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="overline" color="text.secondary">
                        {t('economy.period')}: {row.period}
                      </Typography>
                      <Typography variant="h6">{row.amount} kr</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('economy.dueDate')}: {row.dueDate}
                      </Typography>
                    </Box>
                    <StatusChip kind="invoice" value={row.status} />
                    {row.status !== 'paid' && (
                      <Button
                        variant="contained"
                        disabled={pay.isPending}
                        onClick={() => pay.mutateAsync(row.id)}
                      >
                        {t('economy.pay')}
                      </Button>
                    )}
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

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/economy/ResidentRentPage`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/economy/ResidentRentPage.tsx src/features/economy/ResidentRentPage.test.tsx
git commit -m "feat(m5): add resident rent page with mock pay action"
```

---

## Task 5: Wire dashboard "unpaid rent" card

**Files:**
- Modify: `src/features/dashboard/AdminDashboard.tsx`
- Modify: `src/features/dashboard/AdminDashboard.test.tsx`

- [ ] **Step 1: Update the dashboard test**

Replace the assertion to expect the unpaid count too:

```tsx
import { vi, afterEach } from 'vitest';
// ...
beforeEach(() => {
  localStorage.clear();
  seedDatabase();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

it('shows the property counts and live counts for maintenance and rent', async () => {
  renderWithProviders(<AdminDashboard />, { route: '/admin' });
  await waitFor(() => {
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    // 2 open maintenance + 3 unpaid invoices; both happen to render
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update `AdminDashboard.tsx`**

Add the import + count:

```tsx
import { useInvoices } from '@/services/hooks/economy';
// ...
const invoices = useInvoices();
const unpaid = invoices.data?.filter((r) => r.status !== 'paid').length ?? 0;
```

Replace the unpaid-rent card's value:

```tsx
{ label: t('dashboard.unpaidRent'), value: unpaid, to: '/admin/economy' },
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/dashboard`
Expected: PASS (1 test).

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard
git commit -m "feat(m5): wire dashboard unpaid-rent card to live count"
```

---

## Task 6: Routes + nav links

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/components/AdminLayout.tsx`
- Modify: `src/components/ResidentLayout.tsx`

- [ ] **Step 1: Update `routes.tsx`**

```tsx
import { AdminEconomyPage } from '@/features/economy/AdminEconomyPage';
import { ResidentRentPage } from '@/features/economy/ResidentRentPage';

// inside admin layout:
<Route path="economy" element={<AdminEconomyPage />} />

// inside resident layout:
<Route path="/rent" element={<ResidentRentPage />} />
```

- [ ] **Step 2: Add Ekonomi to admin drawer**

`AdminLayout.tsx`:

```tsx
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
// items:
{ to: '/admin/economy', icon: <AttachMoneyIcon />, label: t('nav.economy'), end: false },
```

- [ ] **Step 3: Add Hyra to resident BottomNav**

`ResidentLayout.tsx`:

```tsx
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
// extend the `value` derivation:
const value = pathname.startsWith('/maintenance')
  ? '/maintenance'
  : pathname.startsWith('/chat')
    ? '/chat'
    : pathname.startsWith('/rent')
      ? '/rent'
      : '/home';

// add a tab:
<BottomNavigationAction value="/rent" label={t('nav.rent')} icon={<AttachMoneyIcon />} />
```

- [ ] **Step 4: Full test + typecheck**

Run: `npx vitest run`
Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/app src/components
git commit -m "feat(m5): wire /admin/economy and /rent with nav links"
```

---

## Task 7: Milestone verification

- [ ] **Step 1**: `npx vitest run` — all green.
- [ ] **Step 2**: `npm run typecheck` — clean.
- [ ] **Step 3**: `npm run build` — succeeds.
- [ ] **Step 4**: Manual smoke — admin Ekonomi shows invoices + total; reminder Snackbar appears; resident Hyra lists own invoices; pay flips status; dashboard unpaid count reflects state.

---

## Definition of done (Milestone 5)

- `npx vitest run`, `npm run typecheck`, `npm run build` all green.
- Admin sees every invoice with derived status and unpaid total; can send (mock) reminders.
- Residents see their own invoices and can pay; status updates correctly; dashboard count refreshes.
- Nav links present in both layouts.
