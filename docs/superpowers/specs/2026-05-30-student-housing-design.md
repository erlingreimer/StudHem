# Student Housing Management App — Design Decisions & Additions

**Date:** 2026-05-30
**Status:** Approved (brainstorming → ready for implementation planning)
**Base specification:** [`student-housing-spec.md`](../../../student-housing-spec.md)

This document is a **design addendum** to the build specification at the repo root. The
base spec defines the product, screens, data model, routing, milestones, and acceptance
criteria; treat it as authoritative for everything not restated here. This document
records the decisions made during brainstorming, the business-case additions approved for
v1, the data-model extensions those additions require, the testing strategy, and the
items explicitly deferred to a roadmap.

When the two documents appear to disagree, **this document wins** (it is the later,
decision-bearing artifact), except where it explicitly defers to the base spec.

---

## 1. Decisions log

| # | Decision | Choice |
|---|----------|--------|
| D1 | Mock data persistence | **localStorage-backed** mock (seeded fixtures, writes persist across reloads, versioned keys) |
| D2 | Data-fetching / async state | **TanStack Query** (`@tanstack/react-query`) wrapping the service layer |
| D3 | Testing depth | **Full TDD** (Vitest + React Testing Library), red-green-refactor per milestone |
| D4 | v1 business-case additions | **Booking rules engine**, **Invite → onboarding**, **Move-out / notice flow** |
| D5 | Date library / pickers | **dayjs** (sv locale) + **`@mui/x-data-pickers`** for contract, notice, and booking dates |
| D6 | Photo upload (no backend) | Client-side **downscale to base64** data URLs stored in localStorage |
| D7 | Onboarding entry point | Dedicated guarded **`/onboarding`** route (not an inline modal) |
| D8 | Booking facility scoping | Lightweight **building** model; residents see only facilities in their own building |
| D9 | Notice period | **2 months** minimum (single configurable constant) |
| D10 | Maintenance `category` | Constrained to an **enum** (for i18n) rather than free text |

These are starting defaults chosen during brainstorming and approved by the user. D9's
value lives in one constant so it is trivial to change.

---

## 2. Architecture

Stack and folder layout follow the base spec (§2) exactly. Additions and the key seams:

- **Service seam.** `src/services/api.ts` defines a typed `Api` interface whose methods
  return Promises (e.g. `properties.list()`, `maintenance.create()`, `bookings.create()`).
  The mock implementation lives under `src/services/mock/` (localStorage impl + typed
  fixtures). **UI code never imports the mock directly** — it consumes the `Api` interface
  through React Query hooks in `src/services/hooks/`. Swapping to a REST backend is a new
  implementation behind the same interface; no UI changes.

- **Async state (D2).** Every read is a `useQuery`, every write a `useMutation` that
  invalidates the relevant query keys. This is the single mechanism for the base spec's
  loading (`Skeleton`) / empty + error (`Alert`) NFR, removing hand-rolled `useEffect`
  fetch boilerplate. A central query-key factory keeps invalidation consistent.

- **Mock behavior.** The mock seeds fixtures into localStorage on first run under
  versioned keys (`studhem.v1.*`), then reads/writes there. It simulates ~300ms latency
  and exposes a dev-only error toggle so error (`Alert`) states are demonstrable and
  testable.

- **New dependencies beyond the base spec stack:** `@tanstack/react-query`,
  `@mui/x-date-pickers`, `dayjs`, and the test toolchain (`vitest`,
  `@testing-library/react`, `@testing-library/user-event`, `jsdom`).

---

## 3. Data model extensions

All base-spec interfaces (§6) are retained. The approved additions require these
**additive, backward-compatible** changes:

```ts
// Onboarding (addition C / §5 below)
interface User {
  // ...all base-spec fields...
  status: 'pending' | 'active';   // ADDED: pending until first-login password set
}

// Move-out / notice flow (addition E)
type ContractStatus = 'active' | 'notice_given' | 'ended';
interface Contract {
  // ...all base-spec fields...
  status: ContractStatus;         // ADDED
  noticeGivenAt?: string;         // ADDED: ISO, set when resident gives notice
}

// Booking rules engine (addition D)
interface Property {
  // ...all base-spec fields...
  buildingId: string;             // ADDED: groups properties + their shared facilities
}

interface Facility {              // NEW entity
  id: string;
  type: FacilityType;             // base-spec enum: laundry | common_room | guest_room | sauna
  buildingId: string;
  label: string;                  // e.g. "Tvättstuga A"
}

interface Booking {
  // ...all base-spec fields...
  facilityId: string;            // ADDED: references a concrete Facility instance
  // facilityType is retained for convenience/display
}

// Maintenance category as enum (D10)
type MaintenanceCategory =
  | 'appliance' | 'plumbing' | 'electrical' | 'heating'
  | 'door_lock' | 'internet' | 'other';
// MaintenanceRequest.category: MaintenanceCategory (was: string)
```

`PropertyStatus` stays `vacant | occupied` (base spec). "Notice given / vacating soon" is
**derived from the contract**, surfaced as a secondary chip — the enum is not extended.

---

## 4. Auth & onboarding *(addition: Invite → onboarding)*

- **Mock auth.** `AuthContext` does a plaintext password compare against `User` fixtures,
  clearly commented as a non-production placeholder (per base spec §1, §6). The session is
  persisted in localStorage. Route guards: unauthenticated → `/login`; authenticated but
  wrong role → that role's home (base spec §4, §7).

- **Invite flow.** Admin "Invite to property" (base spec §5) collects name + email/username,
  then: creates a `User { role:'resident', status:'pending' }`, assigns them to the property
  (creates a draft `Contract`, sets `Property.residentId`, status → `occupied`), and shows
  the admin a generated **temporary password** in a `Dialog` to share with the resident
  (mock stand-in for a real email).

- **First login.** A `pending` resident who logs in with the temp password is routed to a
  guarded **`/onboarding`** page to set a real password; on submit, `status → active` and
  the password is updated. Guards keep `active` users out of `/onboarding` and `pending`
  users out of the rest of the app until onboarding completes.

---

## 5. Feature designs (by base-spec milestone)

Milestones and screens follow base spec §5 and §9. Notes below capture the decisions and
additions layered on top.

1. **Scaffold.** Vite+TS+MUI, theme with light/dark toggle persisted in localStorage,
   `CssBaseline`, routing skeleton, mock `AuthContext` + guards, working login. **Login
   screen surfaces demo credentials** (it is a mock). React Query provider + i18n provider +
   date-picker localization provider wired here.

2. **Admin properties.** Dashboard summary cards — properties, occupancy %, vacancies,
   open maintenance, unpaid rent, **+ upcoming move-outs** — each linking to its detail
   view. Properties `DataGrid` (search/filter/status). Property detail (info, rent,
   resident, contract, maintenance history). Create/edit in a `Dialog`. Invite resident
   (§4 flow).

3. **Maintenance.** Admin inbox (status + staff assignment); resident report form with
   **photo upload → client-side downscaled base64** (max ~1024px, JPEG ~0.7, ≤3 photos,
   localStorage-quota guarded). Shared `StatusChip` (semantic colors per base spec §3).
   Status changes append to `history[]`. `category` uses the `MaintenanceCategory` enum
   (D10) so options are translatable.

4. **Chat.** Conversation list + thread view, one conversation per resident/property, both
   roles, mock send through the service layer.

5. **Economy.** Admin invoice list + payment status + mock "send reminder" action;
   resident rent view, **mock pay** (`status → paid`, sets `paidAt`), and payment history.
   `StatusChip` invoice colors per base spec. *(OCR reference numbers, late fees, and
   reminder realism are deferred — see §7.)*

6. **Bookings — rules engine** *(addition).* Facilities belong to a **building** (D8);
   residents see only facilities in their own building. Slot model by facility type:
   **laundry & sauna = fixed time slots** generated per chosen day; **guest room & common
   room = full-day** bookings. The service enforces **no double-booking** (overlap
   rejection) and a **per-resident future-booking limit** (default 2 per facility type).
   Residents can cancel their own future bookings; admin sees and manages all bookings.

7. **Move-out / notice flow** *(addition).* Resident gives notice from "My housing" with a
   chosen move-out date ≥ the **2-month** notice period (D9); this sets `Contract.endDate`,
   `noticeGivenAt`, and `status → notice_given`. Property detail and the dashboard show
   "vacating YYYY-MM-DD" via a secondary chip (derived from the contract). Admin "mark as
   moved out" → `Contract.status → ended`, property → `vacant`, `residentId` cleared.
   Notice period is one configurable constant.

8. **Documents + polish.** Documents screen (house rules / guides / FAQ in sv + en); FAQ
   rendered as in-app accordion content, guides/rules as linked or embedded items. Full
   i18n pass (no hardcoded user-facing strings), accessibility pass (WCAG AA contrast in
   both themes, labelled inputs, visible focus, semantic headings, keyboard-navigable
   dialogs/menus), empty/loading/error states everywhere, final responsive cleanup.

---

## 6. Testing strategy (full TDD — D3)

Red-green-refactor per milestone; tests live beside source; `npm test` green before each
milestone commit.

**Service layer (unit — the swappable contract):**
- CRUD correctness for each entity and persistence round-trips through localStorage.
- **Booking overlap rejection** and per-resident future-booking limit enforcement.
- Invoice pay transition (`unpaid/overdue → paid`, sets `paidAt`).
- Notice-period validation (rejects move-out dates inside the 2-month window) and the
  `active → notice_given → ended` contract transitions.
- Invite → `pending` → `active` onboarding transition.

**Components / flows (React Testing Library):**
- Login + guard redirects, including cross-role access blocked.
- Submit maintenance request → appears in the admin inbox; admin status change is visible
  to the resident.
- Pay invoice → status + color update.
- Create booking → conflicting slot is blocked in the UI.
- Language toggle swaps visible strings; theme toggle persists across reload.

---

## 7. Deferred to roadmap (documented, not built in v1)

- **Housing queue / application system (*kösystem*, kötid)** — the major phase-2 feature of
  real Swedish student housing (queue time, applications, offers). Out of v1 scope; its own
  spec → plan cycle.
- **Deposit (*deposition*)** and **move-out inspection (*besiktning*)**.
- **Payment realism:** OCR reference numbers, late/reminder fees (*påminnelseavgift*).
- **Maintenance niceties:** urgency/priority flag and "may technicians enter when I'm not
  home?" consent field.
- **In-app activity / notification badges** (non-push). Note: push notifications, BankID,
  and digital contract signing remain excluded per base spec §1.

---

## 8. Open defaults the user may still override

These were chosen as sensible defaults and approved; called out so they are easy to revisit
during planning or implementation:

- **D8** two-building seed + facility-to-building scoping for bookings.
- **D9** two-month notice period (single constant).
- **D7** onboarding as its own `/onboarding` route.
- Seed dataset size: ~8–10 properties across 2 buildings; 1 admin + 1 staff + 3 residents
  (one `pending` to demo onboarding); supporting contracts, invoices, requests, bookings,
  messages, and sv+en documents.
