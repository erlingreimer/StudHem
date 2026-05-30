# Student Housing Management App — Build Specification

## For the implementing agent (Claude Code)

Build this as a single-page web application, incrementally, following the milestones in section 9 **in order**. After each milestone, make sure the app builds and runs (`npm run dev`) with no console errors before moving on. Use TypeScript everywhere.

Keep a clean service abstraction (`src/services/`) so the mock data layer can later be swapped for a real backend without touching UI code. Do **not** build a real authentication backend in this version; use a mock auth context with username/password, clearly marked in code as a placeholder that is not production-secure.

Commit after each milestone with a descriptive message.

---

## 1. Product overview

A management app for student housing ("studentboende") with two user roles:

- **Admin/staff** who manage the properties.
- **Residents** ("boende") who live in them.

Swedish-first UI, with English as a fallback for international students. This version explicitly excludes: push notifications, BankID, and digital contract signing. Login is plain username and password.

---

## 2. Tech stack

- **React 18 + TypeScript**, built with **Vite**
- **MUI v6** (`@mui/material`, `@mui/icons-material`) following Material Design principles
- **MUI X DataGrid** (`@mui/x-data-grid`) for admin tables
- **React Router v6** for routing
- **react-hook-form** (with `zod` for validation) for forms
- **Emotion** (bundled with MUI) for styling via the `sx` prop and `styled`
- **react-i18next** for i18n, default locale `sv`, fallback `en`
- A **mock service layer** under `src/services/` returning Promises, backed by typed in-memory fixtures, designed to be replaced by REST calls later

Suggested project structure:

```
src/
  app/           # App shell, providers, routing
  theme/         # MUI theme + color mode context
  auth/          # AuthContext, route guards, login
  components/    # Shared UI (StatusChip, PageHeader, EmptyState, etc.)
  features/
    properties/  # Admin property management
    maintenance/ # Maintenance requests (both roles)
    chat/        # Messaging (both roles)
    economy/     # Rent and invoices
    bookings/    # Shared facility bookings
    documents/   # House rules, guides, FAQ
  services/      # api.ts + mock implementations + fixtures
  types/         # Shared TypeScript interfaces
  i18n/          # Locale files sv.json, en.json
```

---

## 3. Design system (MUI guidelines)

Centralize all theming in `src/theme/`. Build the theme with `createTheme` and support light/dark mode via a `ColorModeContext` + `ThemeProvider` + `CssBaseline`.

- **Palette:** a calm, trustworthy primary (deep blue or teal), one secondary accent, and consistent use of the semantic colors (`success`, `warning`, `error`, `info`) for all statuses.
- **Typography:** use the theme typography scale and `Typography` variants (`h4`, `h6`, `body1`, `body2`, `caption`). No hardcoded font sizes.
- **Shape:** rounded corners via `theme.shape.borderRadius` (set to 12). Consistent, restrained elevation on `Card`/`Paper`.
- **Spacing:** always use `theme.spacing` through the `sx` prop (e.g. `sx={{ p: 2, gap: 2 }}`). Never raw pixel values.
- **Layout:** mobile-first, responsive with `Stack`, `Grid` (v2), and breakpoints. Admin views adapt to a wider layout: a persistent side `Drawer` on desktop, a temporary `Drawer` or `BottomNavigation` on mobile. Resident views are mobile-first with `BottomNavigation`.

Standardized components:

- **Navigation:** `AppBar` + `Drawer` for admin; `BottomNavigation` for resident/mobile.
- **Lists/tables:** `DataGrid` for admin property and request lists; `List`/`Card` for resident views.
- **Status:** a shared `StatusChip` component built on `Chip` with semantic colors:
  - Property: `vacant` = default, `occupied` = success
  - Maintenance: `received` = info, `in_progress` = warning, `resolved` = success
  - Invoice: `paid` = success, `unpaid` = warning, `overdue` = error
- **Forms:** `TextField`, `Select`, `Button`, with create/edit flows in a `Dialog`.
- **Feedback:** `Snackbar` for success/error toasts, `Skeleton` for loading, `Alert` for empty and error states.
- **Accessibility:** strong contrast in both modes, labelled inputs, visible focus states, keyboard-navigable dialogs and menus, semantic heading order.

---

## 4. Roles and access

- `admin` / `staff`: full management access. For v1, treat them the same and leave a `TODO` for granular permissions (e.g. hiding economy from staff).
- `resident`: access limited to their own housing, requests, chat, rent, bookings, and documents.

Implement route guards that redirect unauthenticated users to `/login` and block residents from admin routes (and vice versa).

---

## 5. Screens

### Admin

- **Login** — username and password.
- **Dashboard** — summary cards: number of properties, occupancy rate, vacancies, open maintenance requests, unpaid rent. Each links to its detail view.
- **Properties list** — `DataGrid` of all properties with search, filtering, and status (vacant/occupied).
- **Property detail** — info, rent, current resident, contract, and maintenance history for that property.
- **Create / edit property** — form in a dialog.
- **Invite person to a property** — assign a resident to a property by email/username.
- **Contract view** — view contract details and terms (no signing).
- **Maintenance inbox** — list of incoming requests with status (received, in progress, resolved) and assignment to staff.
- **Chat** — conversations with residents, grouped per resident or property.
- **Economy** — rent invoicing, payment status, and reminders.
- **Bookings admin** — manage bookings for shared facilities.

### Resident

- **Login** — username and password.
- **Home / overview** — my housing and upcoming rent.
- **My housing** — room, rent, key dates, contract.
- **Maintenance** — report a fault with photo upload and status tracking on my own requests.
- **Chat** — conversation with the manager.
- **Rent** — view and pay, with payment history.
- **Bookings** — book the laundry room and other shared facilities; see my bookings.
- **Documents** — house rules, guides, and FAQ (English available for international students).

---

## 6. Data model

Define these in `src/types/`. Mock fixtures in `src/services/` implement against them.

```ts
type Role = 'admin' | 'staff' | 'resident';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  // mock only: plaintext compare in the mock auth service, never in production
  password: string;
}

type PropertyStatus = 'vacant' | 'occupied';

interface Property {
  id: string;
  name: string;
  address: string;
  roomType: string;       // e.g. "corridor room", "studio"
  rent: number;           // SEK per month
  status: PropertyStatus;
  description?: string;
  residentId?: string;    // current resident, if occupied
}

interface Contract {
  id: string;
  propertyId: string;
  residentId: string;
  startDate: string;      // ISO
  endDate?: string;       // ISO
  rent: number;
  terms: string;
}

type MaintenanceStatus = 'received' | 'in_progress' | 'resolved';

interface MaintenanceRequest {
  id: string;
  propertyId: string;
  residentId: string;
  category: string;       // e.g. "appliance", "plumbing"
  description: string;
  photoUrls: string[];
  status: MaintenanceStatus;
  assignedTo?: string;    // staff user id
  createdAt: string;
  history: { status: MaintenanceStatus; at: string; note?: string }[];
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
}

interface Conversation {
  id: string;
  propertyId: string;
  participantIds: string[]; // resident + manager(s)
}

type InvoiceStatus = 'paid' | 'unpaid' | 'overdue';

interface Invoice {
  id: string;
  contractId: string;
  period: string;         // e.g. "2026-06"
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  paidAt?: string;
}

type FacilityType = 'laundry' | 'common_room' | 'guest_room' | 'sauna';

interface Booking {
  id: string;
  facilityType: FacilityType;
  bookedById: string;     // resident id
  start: string;          // ISO
  end: string;            // ISO
}

interface DocumentItem {
  id: string;
  title: string;
  type: 'house_rules' | 'guide' | 'faq';
  url: string;
  language: 'sv' | 'en';
}
```

---

## 7. Routing

Admin (guarded, role `admin`/`staff`):
`/admin`, `/admin/properties`, `/admin/properties/:id`, `/admin/maintenance`, `/admin/chat`, `/admin/economy`, `/admin/bookings`

Resident (guarded, role `resident`):
`/home`, `/my-housing`, `/maintenance`, `/chat`, `/rent`, `/bookings`, `/documents`

Public: `/login`. Unknown routes redirect to the role's home.

---

## 8. Non-functional requirements

- Fully responsive, mobile-first; admin usable on tablet/desktop widths.
- Light and dark mode, toggleable, persisted in `localStorage`.
- Swedish default, English fallback; all user-facing strings in i18n files, none hardcoded.
- WCAG AA contrast in both themes; keyboard accessible.
- All async data goes through the service layer with loading (`Skeleton`) and empty/error (`Alert`) states.
- No notifications, no BankID, no digital signing.

---

## 9. Build milestones

1. **Scaffold** — Vite + TS + MUI installed, theme with light/dark toggle, `CssBaseline`, routing skeleton, mock `AuthContext` with login and route guards. App runs with a working login for one admin and one resident fixture.
2. **Admin properties** — dashboard cards, properties `DataGrid` (search/filter/status), property detail, create/edit dialog, invite resident.
3. **Maintenance** — admin inbox with status and assignment; resident report form (photo upload) and status tracking. Shared `StatusChip`.
4. **Chat** — conversation list and thread view for both roles against the mock service.
5. **Economy** — admin invoicing and payment status; resident rent view, pay action (mock), and history.
6. **Bookings** — resident booking flow for laundry and facilities; admin booking management.
7. **Documents + polish** — documents screen, i18n pass (sv/en), accessibility pass, empty/loading/error states, final responsive cleanup.

---

## 10. Acceptance criteria

- App builds and runs with no console errors or TypeScript errors.
- Logging in as admin lands on the admin dashboard; logging in as resident lands on resident home; guards block cross-role access.
- Admin can create, edit, search, and filter properties, and assign a resident.
- A resident can submit a maintenance request with a photo; it appears in the admin inbox; status changes by the admin are visible to the resident.
- Rent invoices display correct status colors; the resident pay action updates status to paid (mock).
- A resident can create a booking that the admin can see.
- Light/dark toggle works and persists; switching language between Swedish and English updates all visible strings.
- No use of raw pixel values for spacing; colors and typography come from the theme.
