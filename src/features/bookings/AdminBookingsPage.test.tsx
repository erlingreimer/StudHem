import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminBookingsPage } from '@/features/bookings/AdminBookingsPage';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminBookingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('lists every seeded booking with the resident name', async () => {
    renderWithProviders(<AdminBookingsPage />, { route: '/admin/bookings' });
    await waitFor(() => expect(screen.getByText(/rasmus resident/i)).toBeInTheDocument());
    expect(screen.getByText(/rebecka resident/i)).toBeInTheDocument();
  });
});
