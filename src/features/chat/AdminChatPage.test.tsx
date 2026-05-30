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
