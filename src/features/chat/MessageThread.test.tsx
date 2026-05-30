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
