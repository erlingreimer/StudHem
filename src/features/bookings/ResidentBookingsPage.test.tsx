import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentBookingsPage } from '@/features/bookings/ResidentBookingsPage';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentBookingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('lists facilities only from the resident\'s building (Norra)', async () => {
    renderWithProviders(<ResidentBookingsPage />, { route: '/bookings' });
    await userEvent.click(await screen.findByLabelText(/välj lokal/i));
    expect(await screen.findByRole('option', { name: /tvättstuga norra/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /tvättstuga södra/i })).not.toBeInTheDocument();
  });

  it('shows my existing bookings in the "my bookings" panel', async () => {
    renderWithProviders(<ResidentBookingsPage />, { route: '/bookings' });
    await waitFor(() =>
      expect(screen.getByText(/2026-06-05/)).toBeInTheDocument(),
    );
  });
});
