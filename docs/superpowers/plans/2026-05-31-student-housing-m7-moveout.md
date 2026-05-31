# Student Housing App — Milestone 7 (Move-out / notice flow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let residents give notice (with a `2-month` minimum window enforced by the service), surface "vacating YYYY-MM-DD" on the property detail and a live count on the admin dashboard, and let admin mark a notice as moved out (`Contract.status → ended`, property → `vacant`, `residentId` cleared).

**Architecture:** Extend `contracts` mock API with `byResidentId`, `giveNotice`, and `markMovedOut`. Notice validation lives in the service using `NOTICE_PERIOD_MONTHS` from `config/constants` (already 2). The resident's `/home` placeholder becomes the **"My housing"** page (per spec §5) and surfaces the give-notice flow — keeps bottom nav at five tabs. Property detail gets a secondary `Vacating YYYY-MM-DD` chip when the contract is `notice_given`, and admin sees a `Mark as moved out` action.

**Tech Stack:** Uses `dayjs` (already installed) for the notice-window math.

---

## Plan series context

This is **plan 7 of 8**. Previous: M1–M6.

### Scope clarifications

- **Notice window**: the chosen `moveOutDate` must satisfy `dayjs(moveOutDate).diff(today, 'month', true) >= NOTICE_PERIOD_MONTHS`. The service throws `Error('notice_too_short')` otherwise; the UI translates.
- **Confirmation**: residents pick a date with `<input type="date">` (deferring full MUI X DatePicker integration to polish in M8).
- **Property status during notice**: stays `occupied`; the "vacating" chip is purely derived from the contract.
- **markMovedOut atomicity**: a single service call updates contract + property; the mock doesn't need true transactions but should not leave a half-state.
- **Admin button visibility**: `Mark as moved out` appears only when `contract.status === 'notice_given'` and the chosen date is in the past — but to keep the demo simple, M7 shows it whenever status is `notice_given` and lets admin invoke any time.

---

## File structure map (M7 additions)

```
src/
  features/dashboard/
    AdminDashboard.tsx                ✦ live "upcoming move-outs"
    ResidentHome.tsx                  ✦ replaces placeholder → My housing
    ResidentHome.test.tsx             ✦
  features/properties/
    PropertyDetailPage.tsx            ✦ "vacating" chip + mark-moved-out button
    PropertyDetailPage.test.tsx       ✦ extended
  services/
    api.ts                            ✦ ContractsApi adds byResidentId / giveNotice / markMovedOut
    hooks/contracts.ts                ✦ new hooks
    hooks/queryKeys.ts                ✦
    mock/contractsService.ts          ✦ rules engine for notice + move-out
    mock/contractsService.test.ts     ✦
  i18n/locales/sv.json, en.json       ✦ moveOut.*
```

---

## Task 0: Extend ContractsApi (byResidentId / giveNotice / markMovedOut)

**Files:** modify `api.ts`, `mock/contractsService.ts`, create `mock/contractsService.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('contracts service (M7 transitions)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('byResidentId returns the active contract for that resident', async () => {
    const c = await api.contracts.byResidentId('u-res1');
    expect(c?.id).toBe('c-1');
  });

  it('giveNotice with a sufficient window updates the contract', async () => {
    const moveOut = dayjs().add(2, 'month').add(1, 'day').format('YYYY-MM-DD');
    const updated = await api.contracts.giveNotice('c-1', moveOut);
    expect(updated.status).toBe('notice_given');
    expect(updated.endDate).toBe(moveOut);
    expect(updated.noticeGivenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('giveNotice rejects a date inside the 2-month window', async () => {
    const tooSoon = dayjs().add(1, 'month').format('YYYY-MM-DD');
    await expect(api.contracts.giveNotice('c-1', tooSoon)).rejects.toThrow('notice_too_short');
  });

  it('markMovedOut transitions to ended, vacates the property, and clears residentId', async () => {
    const moveOut = dayjs().add(2, 'month').add(1, 'day').format('YYYY-MM-DD');
    await api.contracts.giveNotice('c-1', moveOut);

    const result = await api.contracts.markMovedOut('c-1');
    expect(result.contract.status).toBe('ended');
    expect(result.property.status).toBe('vacant');
    expect(result.property.residentId).toBeUndefined();

    // Confirm in storage
    const property = await api.properties.get('p-101');
    expect(property?.status).toBe('vacant');
    expect(property?.residentId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/services/mock/contractsService`

- [ ] **Step 3: Extend `api.ts`**

```ts
export interface MarkMovedOutResult {
  contract: import('@/types').Contract;
  property: import('@/types').Property;
}

export interface ContractsApi {
  byPropertyId(propertyId: string): Promise<Contract | undefined>;
  byResidentId(residentId: string): Promise<Contract | undefined>;
  giveNotice(contractId: string, moveOutDate: string): Promise<Contract>;
  markMovedOut(contractId: string): Promise<MarkMovedOutResult>;
}
```

- [ ] **Step 4: Replace `mock/contractsService.ts`**

```ts
import type { ContractsApi, MarkMovedOutResult } from '@/services/api';
import type { Contract, Property } from '@/types';
import {
  MOCK_LATENCY_MS, NOTICE_PERIOD_MONTHS,
} from '@/config/constants';
import dayjs from 'dayjs';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createContractsService(): ContractsApi {
  return {
    async byPropertyId(propertyId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Contract>('contracts', []).find(
        (c) => c.propertyId === propertyId && c.status !== 'ended',
      );
    },
    async byResidentId(residentId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Contract>('contracts', []).find(
        (c) => c.residentId === residentId && c.status !== 'ended',
      );
    },
    async giveNotice(contractId, moveOutDate) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Contract>('contracts', contractId);
      if (!existing) throw new Error(`contract_not_found:${contractId}`);
      const monthsFromNow = dayjs(moveOutDate).diff(dayjs(), 'month', true);
      if (monthsFromNow < NOTICE_PERIOD_MONTHS) {
        throw new Error('notice_too_short');
      }
      const updated: Contract = {
        ...existing,
        status: 'notice_given',
        endDate: moveOutDate,
        noticeGivenAt: new Date().toISOString(),
      };
      upsertById<Contract>('contracts', updated);
      return updated;
    },
    async markMovedOut(contractId): Promise<MarkMovedOutResult> {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Contract>('contracts', contractId);
      if (!existing) throw new Error(`contract_not_found:${contractId}`);
      if (existing.status !== 'notice_given') {
        throw new Error('contract_not_in_notice');
      }
      const contract: Contract = { ...existing, status: 'ended' };
      upsertById<Contract>('contracts', contract);

      const property = byId<Property>('properties', existing.propertyId);
      if (!property) throw new Error(`property_not_found:${existing.propertyId}`);
      const updatedProperty: Property = {
        ...property,
        status: 'vacant',
        residentId: undefined,
      };
      upsertById<Property>('properties', updatedProperty);

      return { contract, property: updatedProperty };
    },
  };
}
```

- [ ] **Step 5**: Tests + typecheck.

- [ ] **Step 6: Commit**

```bash
git add src/services
git commit -m "feat(m7): add contract transitions (giveNotice, markMovedOut) with rules"
```

---

## Task 1: Query hooks for the new transitions

**Files:** modify `hooks/queryKeys.ts`, `hooks/contracts.ts`.

- [ ] **Step 1: Extend keys**

```ts
contractByResident: (residentId: string) =>
  ['contracts', 'byResident', residentId] as const,
```

- [ ] **Step 2: Extend `hooks/contracts.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useContractByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId ? keys.contractByProperty(propertyId) : ['contracts', 'none'],
    queryFn: async () => (await api.contracts.byPropertyId(propertyId as string)) ?? null,
    enabled: Boolean(propertyId),
  });
}

export function useContractByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId ? keys.contractByResident(residentId) : ['contracts', 'byResident', 'none'],
    queryFn: async () => (await api.contracts.byResidentId(residentId as string)) ?? null,
    enabled: Boolean(residentId),
  });
}

export function useGiveNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, moveOutDate }: { contractId: string; moveOutDate: string }) =>
      api.contracts.giveNotice(contractId, moveOutDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useMarkMovedOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => api.contracts.markMovedOut(contractId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
```

- [ ] **Step 3**: Typecheck.

- [ ] **Step 4: Commit**

```bash
git add src/services/hooks
git commit -m "feat(m7): add hooks for contract notice and move-out transitions"
```

---

## Task 2: i18n keys

**Files:** modify `locales/sv.json`, `locales/en.json`.

Add inside each root:

`sv.json`:

```json
"moveOut": {
  "title": "Min bostad",
  "address": "Adress",
  "rent": "Hyra",
  "startDate": "Inflyttning",
  "noContract": "Inget kontrakt",
  "giveNotice": "Säg upp",
  "noticeTitle": "Säg upp kontraktet",
  "moveOutDate": "Utflyttningsdatum",
  "noticePeriodHint": "Uppsägningstid: 2 månader",
  "tooShort": "Datumet är inom uppsägningstiden",
  "confirm": "Bekräfta uppsägning",
  "cancel": "Avbryt",
  "noticeGiven": "Uppsagt",
  "vacating": "Flyttar ut",
  "markMovedOut": "Markera utflyttad",
  "alreadyNoticed": "Du har redan sagt upp"
},
```

And inside `nav`: `"housing": "Min bostad"` (replaces the `home` label later if we rename).

`en.json` mirror:

```json
"moveOut": {
  "title": "My housing",
  "address": "Address",
  "rent": "Rent",
  "startDate": "Move-in",
  "noContract": "No contract",
  "giveNotice": "Give notice",
  "noticeTitle": "Give notice",
  "moveOutDate": "Move-out date",
  "noticePeriodHint": "Notice period: 2 months",
  "tooShort": "Date is inside the notice period",
  "confirm": "Confirm notice",
  "cancel": "Cancel",
  "noticeGiven": "Notice given",
  "vacating": "Vacating",
  "markMovedOut": "Mark as moved out",
  "alreadyNoticed": "Notice already given"
},
```

And `nav.housing: "My housing"` (we'll keep `nav.home` for now and only swap the label on the bottom nav tab).

- [ ] **Step 1**: Apply edits.
- [ ] **Step 2**: Typecheck.
- [ ] **Step 3**: Commit.

```bash
git add src/i18n
git commit -m "feat(m7): add move-out i18n keys"
```

---

## Task 3: ResidentHome → "My housing" with give-notice dialog

**Files:** replace `src/features/dashboard/ResidentHome.tsx`, create `ResidentHome.test.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentHome / My housing', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('shows my property and contract details', async () => {
    renderWithProviders(<ResidentHome />, { route: '/home' });
    await waitFor(() => expect(screen.getByText(/rum 101/i)).toBeInTheDocument());
    expect(screen.getByText(/standardvillkor/i)).toBeInTheDocument();
  });

  it('rejects a notice inside the 2-month window with a translated alert', async () => {
    renderWithProviders(<ResidentHome />, { route: '/home' });
    await waitFor(() => expect(screen.getByText(/rum 101/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /säg upp/i }));
    const dialog = await screen.findByRole('dialog');
    const tooSoon = dayjs().add(1, 'month').format('YYYY-MM-DD');
    const input = dialog.querySelector('input[type="date"]')! as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, tooSoon);
    await userEvent.click(screen.getByRole('button', { name: /bekräfta uppsägning/i }));
    expect(await screen.findByText(/inom uppsägningstiden/i)).toBeInTheDocument();
  });

  it('gives notice with a valid date and shows the "vacating" chip', async () => {
    renderWithProviders(<ResidentHome />, { route: '/home' });
    await waitFor(() => expect(screen.getByText(/rum 101/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /säg upp/i }));
    const dialog = await screen.findByRole('dialog');
    const moveOut = dayjs().add(2, 'month').add(2, 'day').format('YYYY-MM-DD');
    const input = dialog.querySelector('input[type="date"]')! as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, moveOut);
    await userEvent.click(screen.getByRole('button', { name: /bekräfta uppsägning/i }));
    await waitFor(() =>
      expect(screen.getByText(/flyttar ut/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/dashboard/ResidentHome`

- [ ] **Step 3: Replace `src/features/dashboard/ResidentHome.tsx`**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import { NOTICE_PERIOD_MONTHS } from '@/config/constants';
import { useAuth } from '@/auth/AuthContext';
import { useContractByResident, useGiveNotice } from '@/services/hooks/contracts';
import { useProperty } from '@/services/hooks/properties';

export function ResidentHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const contract = useContractByResident(user?.id);
  const property = useProperty(contract.data?.propertyId);
  const giveNotice = useGiveNotice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState(
    dayjs().add(NOTICE_PERIOD_MONTHS, 'month').add(7, 'day').format('YYYY-MM-DD'),
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const noticed = contract.data?.status === 'notice_given';

  async function submit() {
    setErrorMsg(null);
    if (!contract.data) return;
    try {
      await giveNotice.mutateAsync({
        contractId: contract.data.id,
        moveOutDate,
      });
      setDialogOpen(false);
    } catch (e) {
      if ((e as Error).message === 'notice_too_short') {
        setErrorMsg(t('moveOut.tooShort'));
      } else {
        setErrorMsg((e as Error).message);
      }
    }
  }

  if (contract.isLoading || property.isLoading) {
    return <Skeleton variant="rectangular" height={300} />;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('moveOut.title')}</Typography>
      <Stack sx={{ gap: 2 }}>
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {property.data?.name ?? '—'}
              </Typography>
              {noticed && contract.data?.endDate && (
                <Chip
                  color="warning"
                  size="small"
                  label={`${t('moveOut.vacating')} ${contract.data.endDate}`}
                />
              )}
            </Stack>
            <Typography>{t('moveOut.address')}: {property.data?.address}</Typography>
            <Typography>{t('moveOut.rent')}: {property.data?.rent} kr</Typography>
            {contract.data && (
              <Typography>{t('moveOut.startDate')}: {contract.data.startDate}</Typography>
            )}
          </CardContent>
        </Card>

        <Stack direction="row" sx={{ gap: 2 }}>
          {contract.data && !noticed && (
            <Button variant="outlined" color="error" onClick={() => setDialogOpen(true)}>
              {t('moveOut.giveNotice')}
            </Button>
          )}
          {noticed && (
            <Alert severity="info">{t('moveOut.alreadyNoticed')}</Alert>
          )}
        </Stack>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('moveOut.noticeTitle')}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('moveOut.noticePeriodHint')}
            </Typography>
            <TextField
              type="date"
              label={t('moveOut.moveOutDate')}
              value={moveOutDate}
              onChange={(e) => setMoveOutDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            {errorMsg && <Alert severity="warning">{errorMsg}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('moveOut.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={submit}
            disabled={giveNotice.isPending}
          >
            {t('moveOut.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/dashboard/ResidentHome`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/ResidentHome.tsx src/features/dashboard/ResidentHome.test.tsx
git commit -m "feat(m7): replace ResidentHome placeholder with My housing + give-notice dialog"
```

---

## Task 4: Property detail — vacating chip + mark-moved-out

**Files:** modify `PropertyDetailPage.tsx`, extend `PropertyDetailPage.test.tsx`.

- [ ] **Step 1: Extend the test**

Append:

```tsx
import dayjs from 'dayjs';
// ...

it('shows the vacating chip and lets admin mark the property as moved out', async () => {
  // Pre-stage: give notice via the service directly so we land on the
  // post-notice state without dancing through the resident UI.
  const moveOut = dayjs().add(2, 'month').add(7, 'day').format('YYYY-MM-DD');
  await api.contracts.giveNotice('c-1', moveOut);

  renderWithProviders(<Tree />, { route: '/admin/properties/p-101' });
  await waitFor(() => expect(screen.getByText(/flyttar ut/i)).toBeInTheDocument());

  await userEvent.click(screen.getByRole('button', { name: /markera utflyttad/i }));
  await waitFor(() => expect(screen.getByText(/ingen boende/i)).toBeInTheDocument());
});
```

Add `import { api } from '@/services';` at the top and seedDatabase() call already exists in beforeEach.

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/properties/PropertyDetailPage`

- [ ] **Step 3: Update `PropertyDetailPage.tsx`**

Add at the top:

```tsx
import Chip from '@mui/material/Chip';
import { useMarkMovedOut } from '@/services/hooks/contracts';
```

Inside the component:

```tsx
const markMovedOut = useMarkMovedOut();
const noticed = contract.data?.status === 'notice_given';
```

Insert the vacating chip next to the existing `StatusChip` (between status chip and Edit button):

```tsx
{noticed && contract.data?.endDate && (
  <Chip
    color="warning"
    size="small"
    label={`${t('moveOut.vacating')} ${contract.data.endDate}`}
  />
)}
```

And add a "Mark as moved out" button when noticed (near Edit/Invite):

```tsx
{noticed && (
  <Button
    variant="outlined"
    color="warning"
    onClick={() => contract.data && markMovedOut.mutateAsync(contract.data.id)}
  >
    {t('moveOut.markMovedOut')}
  </Button>
)}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/properties/PropertyDetailPage`

- [ ] **Step 5: Commit**

```bash
git add src/features/properties
git commit -m "feat(m7): show vacating chip and mark-moved-out button on property detail"
```

---

## Task 5: Dashboard "upcoming move-outs" live

**Files:** modify `AdminDashboard.tsx`, extend its test.

- [ ] **Step 1: Read contracts via storage**

Since there is no `useContracts()` hook, do the simplest thing: read `'contracts'` from localStorage and count `status === 'notice_given'`. That avoids inventing a hook for one card.

- [ ] **Step 2: Update `AdminDashboard.tsx`**

```tsx
import { readCollection } from '@/services/mock/storage';
import type { Contract } from '@/types';
// ...

const upcomingMoveOuts = readCollection<Contract>('contracts', [])
  .filter((c) => c.status === 'notice_given').length;

// In cards array:
{ label: t('dashboard.upcomingMoveOuts'), value: upcomingMoveOuts, to: '/admin/properties' },
```

(Reading at render is fine here — `seedDatabase()` already wrote and any later writes only matter on the next render; staleness is tolerable for a count card.)

- [ ] **Step 3: Extend the dashboard test**

```tsx
import { api } from '@/services';
// ...

it('shows upcoming move-outs after a notice is given', async () => {
  const moveOut = dayjs().add(2, 'month').add(7, 'day').format('YYYY-MM-DD');
  await api.contracts.giveNotice('c-1', moveOut);

  renderWithProviders(<AdminDashboard />, { route: '/admin' });
  await waitFor(() => {
    // 1 upcoming move-out now
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });
});
```

Add `import dayjs from 'dayjs';` at the top.

- [ ] **Step 4**: Run tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard
git commit -m "feat(m7): wire dashboard upcoming-move-outs card to live notice count"
```

---

## Task 6: Verification

- [ ] **Step 1**: `npx vitest run` — all green.
- [ ] **Step 2**: `npm run typecheck` — clean.
- [ ] **Step 3**: `npm run build` — succeeds.
- [ ] **Step 4**: Manual smoke:
  - Resident `resident` → /home shows Rum 101, "Säg upp" button.
  - Submit with `today + 1 month` → alert "inom uppsägningstiden".
  - Submit with `today + 2 months + 7 days` → home shows "Flyttar ut" chip + "Du har redan sagt upp" notice.
  - Admin → dashboard shows 1 "Kommande utflyttningar".
  - Admin → property `Rum 101` shows the vacating chip + "Markera utflyttad". Clicking marks the property `Ledigt` and clears the resident.

---

## Definition of done (Milestone 7)

- Service enforces the 2-month notice window; resident UI rejects too-soon dates with a translated alert.
- Property detail and dashboard surface the live notice/vacating state.
- Admin can mark a notice-given contract as ended; property goes vacant and resident cleared atomically.
- `npx vitest run`, `npm run typecheck`, `npm run build` green.
