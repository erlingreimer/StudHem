import { describe, it, expect, beforeEach } from 'vitest';
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
  });

  it('lists only this resident\'s invoices', async () => {
    renderWithProviders(<ResidentRentPage />, { route: '/rent' });
    await waitFor(() =>
      expect(screen.getByText(/period: 2026-03/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/period: 2026-04/i)).toBeInTheDocument();
    expect(screen.getByText(/period: 2026-06/i)).toBeInTheDocument();
    // exactly 3 invoices for u-res1 (inv-4 belongs to c-2/u-res2)
    expect(screen.getAllByText(/period:/i)).toHaveLength(3);
  });

  it('pays an unpaid invoice and removes its pay button', async () => {
    renderWithProviders(<ResidentRentPage />, { route: '/rent' });
    await waitFor(() =>
      expect(screen.getByText(/period: 2026-06/i)).toBeInTheDocument(),
    );
    const buttons = screen.getAllByRole('button', { name: /^betala$/i });
    const initialCount = buttons.length;
    await userEvent.click(buttons[0]);
    await waitFor(() => {
      const remaining = screen.queryAllByRole('button', { name: /^betala$/i });
      expect(remaining.length).toBe(initialCount - 1);
    });
  });
});
