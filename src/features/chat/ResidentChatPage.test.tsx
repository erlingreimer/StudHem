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
