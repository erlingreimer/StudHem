# Student Housing App — Milestone 4 (Chat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let residents and admin/staff exchange messages — one conversation per resident/property — with a list view on the admin side, a single-thread view on the resident side, and persistence through the mock service.

**Architecture:** Add `chat` to the mock `Api` (list conversations by participant, list messages by conversation, send). One `Conversation` per resident, seeded with the admin user as participant. Reuse `TanStack Query` + invalidation. Admin chat page is split-view (conversation list + active thread); resident chat is a single conversation pulled from their participantId. No realtime — sends are followed by `useMutation` → invalidate → refetch.

**Tech Stack:** Adds nothing — M1/M2/M3 stack.

---

## Plan series context

This is **plan 4 of 8**. Previous: M1, M2, M3.

### Scope clarifications

- One conversation per resident (linked to their property). Created at seed time for active residents.
- The conversation's `participantIds` includes the resident plus a single admin user (`u-admin`). Staff visibility is "any admin/staff can see all conversations" — this is the v1 approximation; finer-grained ACLs are deferred.
- Sending a message persists it in localStorage; no realtime push.
- The pending resident has **no conversation** (the invite/onboarding flow doesn't create one in M4 — added when the spec calls for it).
- Sender display: `senderId === user.id` aligns right with primary color; everyone else aligns left with neutral background.

---

## File structure map (M4 additions)

```
src/
  app/routes.tsx                                ✦ adds /admin/chat, /chat
  components/AdminLayout.tsx                    ✦ adds Chat nav entry
  components/ResidentLayout.tsx                 ✦ adds Chat tab
  features/chat/
    ChatApi types live in services/api.ts      (no separate file)
    ConversationList.tsx                       ✦ list of conversations (admin)
    MessageThread.tsx                          ✦ scrolling message list + composer
    AdminChatPage.tsx                          ✦ split-view container
    ResidentChatPage.tsx                       ✦ single-thread container
    MessageThread.test.tsx                     ✦
    AdminChatPage.test.tsx                     ✦
    ResidentChatPage.test.tsx                  ✦
  services/
    api.ts                                     ✦ adds ChatApi
    hooks/queryKeys.ts                         ✦ adds conversation / messages keys
    hooks/chat.ts                              ✦ useConversations / useMessages / useSendMessage
    mock/fixtures.ts                           ✦ conversations + messages
    mock/seed.ts                               ✦ seeds new collections
    mock/chatService.ts                        ✦
    mock/chatService.test.ts                   ✦
    mock/index.ts                              ✦ wires service
  i18n/locales/sv.json, en.json                ✦ adds chat.*, nav.chat
```

---

## Task 0: Conversations + messages fixtures + seed

**Files:**
- Modify: `src/services/mock/fixtures.ts`
- Modify: `src/services/mock/seed.ts`
- Modify: `src/services/mock/seed.test.ts`

- [ ] **Step 1: Extend the seed test**

Append:

```ts
import type { Conversation, Message } from '@/types';
// existing imports keep their types

describe('seedDatabase (chat)', () => {
  beforeEach(() => localStorage.clear());

  it('seeds one conversation per active resident with at least one message', () => {
    seedDatabase();
    const conversations = readCollection<Conversation>('conversations', []);
    const messages = readCollection<Message>('messages', []);
    expect(conversations.length).toBeGreaterThanOrEqual(2);
    // each conversation has at least one message
    for (const c of conversations) {
      expect(messages.some((m) => m.conversationId === c.id)).toBe(true);
    }
    // admin and resident both participate
    for (const c of conversations) {
      expect(c.participantIds).toEqual(expect.arrayContaining(['u-admin']));
    }
  });
});
```

- [ ] **Step 2: Add fixtures**

In `src/services/mock/fixtures.ts` append:

```ts
export const conversationFixtures: Conversation[] = [
  { id: 'conv-1', propertyId: 'p-101', participantIds: ['u-res1', 'u-admin'] },
  { id: 'conv-2', propertyId: 'p-102', participantIds: ['u-res2', 'u-admin'] },
];

export const messageFixtures: Message[] = [
  {
    id: 'msg-1', conversationId: 'conv-1', senderId: 'u-res1',
    text: 'Hej, finns det extra nycklar?', sentAt: '2026-05-21T09:15:00Z',
  },
  {
    id: 'msg-2', conversationId: 'conv-1', senderId: 'u-admin',
    text: 'Ja, kom till receptionen så fixar vi det.', sentAt: '2026-05-21T09:20:00Z',
  },
  {
    id: 'msg-3', conversationId: 'conv-2', senderId: 'u-admin',
    text: 'Välkommen Rebecka! Hör av dig om något.', sentAt: '2026-05-15T10:00:00Z',
  },
];
```

Update the imports at the top:

```ts
import type {
  Building, Contract, Conversation, Facility, MaintenanceRequest,
  Message, Property, User,
} from '@/types';
```

- [ ] **Step 3: Update `seed.ts`**

```ts
import { hasKey, writeCollection } from './storage';
import {
  buildingFixtures, contractFixtures, conversationFixtures, facilityFixtures,
  maintenanceFixtures, messageFixtures, propertyFixtures, userFixtures,
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
}
```

- [ ] **Step 4: Tests + typecheck**

Run: `npx vitest run src/services/mock/seed`
Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/services/mock/fixtures.ts src/services/mock/seed.ts src/services/mock/seed.test.ts
git commit -m "feat(m4): seed conversations and messages for active residents"
```

---

## Task 1: ChatApi + mock service

**Files:**
- Modify: `src/services/api.ts`
- Create: `src/services/mock/chatService.ts`
- Create: `src/services/mock/chatService.test.ts`
- Modify: `src/services/mock/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('chat service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('listConversations returns conversations the user participates in', async () => {
    const adminList = await api.chat.listConversations('u-admin');
    expect(adminList.length).toBeGreaterThanOrEqual(2);

    const residentList = await api.chat.listConversations('u-res1');
    expect(residentList).toHaveLength(1);
    expect(residentList[0].id).toBe('conv-1');
  });

  it('listMessages returns the seeded thread ordered by sentAt ascending', async () => {
    const msgs = await api.chat.listMessages('conv-1');
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs[0].sentAt <= msgs[msgs.length - 1].sentAt).toBe(true);
  });

  it('sendMessage appends a new message and stamps sentAt', async () => {
    const before = (await api.chat.listMessages('conv-1')).length;
    const created = await api.chat.sendMessage({
      conversationId: 'conv-1', senderId: 'u-res1', text: 'Tack!',
    });
    expect(created.id).toMatch(/^msg-/);
    expect(created.sentAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect((await api.chat.listMessages('conv-1')).length).toBe(before + 1);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/services/mock/chatService`
Expected: FAIL — `api.chat` undefined.

- [ ] **Step 3: Extend `src/services/api.ts`**

Add type import + interface, and slot on `Api`:

```ts
// at top, add to existing import:
import type {
  Contract, Conversation, MaintenanceCategory, MaintenanceRequest,
  MaintenanceStatus, Message, Property, SafeUser,
} from '@/types';

// new interfaces before `Api`:

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  text: string;
}

export interface ChatApi {
  listConversations(userId: string): Promise<Conversation[]>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(input: SendMessageInput): Promise<Message>;
}

export interface Api {
  auth: AuthApi;
  properties: PropertiesApi;
  contracts: ContractsApi;
  users: UsersApi;
  maintenance: MaintenanceApi;
  chat: ChatApi;
}
```

- [ ] **Step 4: Write `src/services/mock/chatService.ts`**

```ts
import type { ChatApi, SendMessageInput } from '@/services/api';
import type { Conversation, Message } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateId(): string {
  return `msg-${Math.random().toString(36).slice(2, 10)}`;
}

export function createChatService(): ChatApi {
  return {
    async listConversations(userId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Conversation>('conversations', [])
        .filter((c) => c.participantIds.includes(userId));
    },
    async listMessages(conversationId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Message>('messages', [])
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    },
    async sendMessage(input: SendMessageInput) {
      await delay(MOCK_LATENCY_MS);
      const row: Message = {
        id: generateId(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        text: input.text,
        sentAt: new Date().toISOString(),
      };
      upsertById<Message>('messages', row);
      return row;
    },
  };
}
```

- [ ] **Step 5: Wire into `src/services/mock/index.ts`**

```ts
import { createChatService } from './chatService';
// ...
return {
  auth: createAuthService(),
  properties: createPropertiesService(),
  contracts: createContractsService(),
  users: createUsersService(),
  maintenance: createMaintenanceService(),
  chat: createChatService(),
};
```

- [ ] **Step 6: Tests + typecheck**

Run: `npx vitest run src/services/mock/chatService`
Run: `npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add src/services
git commit -m "feat(m4): add chat mock service (conversations, messages, send)"
```

---

## Task 2: Query hooks + i18n keys

**Files:**
- Modify: `src/services/hooks/queryKeys.ts`
- Create: `src/services/hooks/chat.ts`
- Modify: `src/i18n/locales/sv.json`, `src/i18n/locales/en.json`

- [ ] **Step 1: Extend `queryKeys.ts`**

Add:

```ts
  conversations: (userId: string) => ['conversations', userId] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
```

- [ ] **Step 2: Write `src/services/hooks/chat.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SendMessageInput } from '@/services/api';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? keys.conversations(userId) : ['conversations', 'none'],
    queryFn: () => api.chat.listConversations(userId as string),
    enabled: Boolean(userId),
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationId ? keys.messages(conversationId) : ['messages', 'none'],
    queryFn: () => api.chat.listMessages(conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) => api.chat.sendMessage(input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.messages(row.conversationId) });
    },
  });
}
```

- [ ] **Step 3: Add i18n**

`sv.json` add at root, and `nav.chat: "Chatt"`:

```json
"chat": {
  "title": "Chatt",
  "send": "Skicka",
  "placeholder": "Skriv ett meddelande...",
  "empty": "Inga meddelanden ännu",
  "noConversation": "Välj en konversation",
  "noConversations": "Inga konversationer",
  "you": "Du"
},
```

`en.json` mirror, and `nav.chat: "Chat"`:

```json
"chat": {
  "title": "Chat",
  "send": "Send",
  "placeholder": "Write a message...",
  "empty": "No messages yet",
  "noConversation": "Pick a conversation",
  "noConversations": "No conversations",
  "you": "You"
},
```

- [ ] **Step 4: Tests + typecheck**

Run: `npx vitest run src/services` — all green.
Run: `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/services/hooks src/i18n
git commit -m "feat(m4): add chat query hooks and i18n keys"
```

---

## Task 3: MessageThread component

**Files:**
- Create: `src/features/chat/MessageThread.tsx`
- Create: `src/features/chat/MessageThread.test.tsx`

> Renders a scrollable list of messages + an inline composer. Sender alignment is `senderId === currentUserId ? right : left`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MessageThread } from '@/features/chat/MessageThread';
import { seedDatabase } from '@/services/mock/seed';

describe('MessageThread', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('shows the seeded messages of the selected conversation', async () => {
    renderWithProviders(<MessageThread conversationId="conv-1" />);
    await waitFor(() => expect(screen.getByText(/extra nycklar/i)).toBeInTheDocument());
    expect(screen.getByText(/till receptionen/i)).toBeInTheDocument();
  });

  it('sends a message and refetches the thread', async () => {
    renderWithProviders(<MessageThread conversationId="conv-1" />);
    await waitFor(() => expect(screen.getByText(/extra nycklar/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/skriv ett meddelande/i), 'Tack så mycket!');
    await userEvent.click(screen.getByRole('button', { name: /^skicka$/i }));
    await waitFor(() => expect(screen.getByText(/tack så mycket!/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/chat/MessageThread`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/features/chat/MessageThread.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { useAuth } from '@/auth/AuthContext';
import { useMessages, useSendMessage } from '@/services/hooks/chat';

interface Props {
  conversationId: string;
}

export function MessageThread({ conversationId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const messages = useMessages(conversationId);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    await send.mutateAsync({ conversationId, senderId: user.id, text: text.trim() });
    setText('');
  }

  return (
    <Stack sx={{ height: '100%', minHeight: 400 }}>
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, overflowY: 'auto', p: 1, display: 'flex',
          flexDirection: 'column', gap: 1, minHeight: 0,
        }}
      >
        {messages.isLoading && <Skeleton variant="rectangular" height={120} />}
        {!messages.isLoading && (messages.data?.length ?? 0) === 0 && (
          <Typography color="text.secondary">{t('chat.empty')}</Typography>
        )}
        {messages.data?.map((msg) => {
          const mine = msg.senderId === user?.id;
          return (
            <Box
              key={msg.id}
              sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.25, maxWidth: '70%',
                  bgcolor: mine ? 'primary.main' : 'background.paper',
                  color: mine ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2">{msg.text}</Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}
                >
                  {msg.sentAt.replace('T', ' ').slice(0, 16)}
                </Typography>
              </Paper>
            </Box>
          );
        })}
      </Box>
      <Box component="form" onSubmit={submit} sx={{ p: 1, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          label={t('chat.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={!text.trim() || send.isPending}>
          {t('chat.send')}
        </Button>
      </Box>
    </Stack>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/features/chat/MessageThread`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/MessageThread.tsx src/features/chat/MessageThread.test.tsx
git commit -m "feat(m4): add MessageThread component with inline composer"
```

---

## Task 4: ConversationList + AdminChatPage

**Files:**
- Create: `src/features/chat/ConversationList.tsx`
- Create: `src/features/chat/AdminChatPage.tsx`
- Create: `src/features/chat/AdminChatPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminChatPage } from '@/features/chat/AdminChatPage';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminChatPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('lists conversations identified by resident name', async () => {
    renderWithProviders(<AdminChatPage />, { route: '/admin/chat' });
    await waitFor(() => expect(screen.getByText(/rasmus resident/i)).toBeInTheDocument());
    expect(screen.getByText(/rebecka resident/i)).toBeInTheDocument();
  });

  it('opens the selected thread and sends a message', async () => {
    renderWithProviders(<AdminChatPage />, { route: '/admin/chat' });
    await waitFor(() => expect(screen.getByText(/rasmus resident/i)).toBeInTheDocument());
    await userEvent.click(screen.getByText(/rasmus resident/i));
    await waitFor(() => expect(screen.getByText(/extra nycklar/i)).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/skriv ett meddelande/i), 'Hej Rasmus!');
    await userEvent.click(screen.getByRole('button', { name: /^skicka$/i }));
    await waitFor(() => expect(screen.getByText(/hej rasmus!/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/chat/AdminChatPage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/features/chat/ConversationList.tsx`**

```tsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { Conversation } from '@/types';
import { useUsers } from '@/services/hooks/users';
import { useProperties } from '@/services/hooks/properties';

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function ConversationList({
  conversations, selectedId, currentUserId, onSelect, loading,
}: Props) {
  const { t } = useTranslation();
  const users = useUsers();
  const properties = useProperties();

  const userById = useMemo(
    () => new Map(users.data?.map((u) => [u.id, u]) ?? []),
    [users.data],
  );
  const propertyById = useMemo(
    () => new Map(properties.data?.map((p) => [p.id, p]) ?? []),
    [properties.data],
  );

  if (loading) return <Skeleton variant="rectangular" height={300} />;
  if (conversations.length === 0) {
    return <Typography color="text.secondary">{t('chat.noConversations')}</Typography>;
  }

  return (
    <List dense>
      {conversations.map((c) => {
        const otherIds = c.participantIds.filter((id) => id !== currentUserId);
        const otherNames = otherIds
          .map((id) => userById.get(id)?.name)
          .filter(Boolean)
          .join(', ');
        const property = propertyById.get(c.propertyId);
        return (
          <ListItemButton
            key={c.id}
            selected={c.id === selectedId}
            onClick={() => onSelect(c.id)}
          >
            <ListItemText
              primary={otherNames || c.id}
              secondary={property?.name ?? c.propertyId}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
```

- [ ] **Step 4: Write `src/features/chat/AdminChatPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import { useAuth } from '@/auth/AuthContext';
import { useConversations } from '@/services/hooks/chat';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';

export function AdminChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const conversations = useConversations(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && (conversations.data?.length ?? 0) > 0) {
      setSelectedId(conversations.data![0].id);
    }
  }, [conversations.data, selectedId]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('chat.title')}</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined">
            <ConversationList
              conversations={conversations.data ?? []}
              selectedId={selectedId}
              currentUserId={user?.id ?? ''}
              onSelect={setSelectedId}
              loading={conversations.isLoading}
            />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ height: '70vh' }}>
            {selectedId
              ? <MessageThread conversationId={selectedId} />
              : <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary">{t('chat.noConversation')}</Typography>
                </Box>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/chat/AdminChatPage`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/ConversationList.tsx src/features/chat/AdminChatPage.tsx src/features/chat/AdminChatPage.test.tsx
git commit -m "feat(m4): add admin chat page with conversation list and active thread"
```

---

## Task 5: ResidentChatPage

**Files:**
- Create: `src/features/chat/ResidentChatPage.tsx`
- Create: `src/features/chat/ResidentChatPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentChatPage } from '@/features/chat/ResidentChatPage';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentChatPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('renders the resident\'s only conversation thread', async () => {
    renderWithProviders(<ResidentChatPage />, { route: '/chat' });
    await waitFor(() => expect(screen.getByText(/extra nycklar/i)).toBeInTheDocument());
    expect(screen.getByText(/till receptionen/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/features/chat/ResidentChatPage`
Expected: FAIL.

- [ ] **Step 3: Write `src/features/chat/ResidentChatPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useAuth } from '@/auth/AuthContext';
import { useConversations } from '@/services/hooks/chat';
import { MessageThread } from './MessageThread';

export function ResidentChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const conversations = useConversations(user?.id);
  const conversation = conversations.data?.[0];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('chat.title')}</Typography>
      <Paper variant="outlined" sx={{ height: '70vh' }}>
        {conversations.isLoading
          ? <Skeleton variant="rectangular" height={300} />
          : conversation
            ? <MessageThread conversationId={conversation.id} />
            : <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">{t('chat.noConversation')}</Typography>
              </Box>}
      </Paper>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/chat/ResidentChatPage`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/ResidentChatPage.tsx src/features/chat/ResidentChatPage.test.tsx
git commit -m "feat(m4): add resident chat page (single thread)"
```

---

## Task 6: Routes + nav links

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/components/AdminLayout.tsx`
- Modify: `src/components/ResidentLayout.tsx`

- [ ] **Step 1: Update `routes.tsx`**

Add imports + routes:

```tsx
import { AdminChatPage } from '@/features/chat/AdminChatPage';
import { ResidentChatPage } from '@/features/chat/ResidentChatPage';

// inside <Route path="/admin" ...>
<Route path="chat" element={<AdminChatPage />} />

// inside resident layout
<Route path="/chat" element={<ResidentChatPage />} />
```

- [ ] **Step 2: Add Chat to admin drawer**

`src/components/AdminLayout.tsx` items:

```tsx
import ChatIcon from '@mui/icons-material/Chat';
// inside items array:
{ to: '/admin/chat', icon: <ChatIcon />, label: t('nav.chat'), end: false },
```

- [ ] **Step 3: Add Chat to resident BottomNav**

`src/components/ResidentLayout.tsx`:

```tsx
import ChatIcon from '@mui/icons-material/Chat';
// update `value` derivation:
const value = pathname.startsWith('/maintenance')
  ? '/maintenance'
  : pathname.startsWith('/chat')
    ? '/chat'
    : '/home';

// add a third BottomNavigationAction:
<BottomNavigationAction value="/chat" label={t('nav.chat')} icon={<ChatIcon />} />
```

- [ ] **Step 4: Run all tests + typecheck**

Run: `npx vitest run`
Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/app src/components
git commit -m "feat(m4): wire /admin/chat and /chat with nav links"
```

---

## Task 7: Milestone verification

- [ ] **Step 1: Full test suite green**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck` and `npm run build`.

- [ ] **Step 3: Manual dev-server smoke**

`npm run dev`:
- Admin sees Chatt in drawer; conversation list shows Rasmus + Rebecka; selecting Rasmus shows the seeded thread; typing a message sends it (appears immediately, persisted on reload).
- Resident `resident` sees Chatt in bottom nav; the thread with admin loads; sending a message works; reload preserves it.
- Resident `resident2` sees only their conversation.
- Theme + i18n still toggle.

- [ ] **Step 4: Final commit (if needed)**

```bash
git add -A
git commit -m "chore(m4): milestone 4 (chat) complete"
```

---

## Definition of done (Milestone 4)

- `npx vitest run`, `npm run typecheck`, `npm run build` all green.
- Admin can browse all conversations and reply; residents see their own thread and reply; messages persist through reload.
- Nav links work for both layouts.
- No hardcoded strings; all status/labels via i18n.
