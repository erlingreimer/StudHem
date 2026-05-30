import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentMaintenancePage } from '@/features/maintenance/ResidentMaintenancePage';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentMaintenancePage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('lists only the resident\'s own seeded requests', async () => {
    renderWithProviders(<ResidentMaintenancePage />, { route: '/maintenance' });
    await waitFor(() =>
      expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/låset hakar upp/i)).toBeInTheDocument();
    expect(screen.queryByText(/kylskåpet fryser/i)).not.toBeInTheDocument();
  });

  it('opens the new-request dialog when the button is clicked', async () => {
    renderWithProviders(<ResidentMaintenancePage />, { route: '/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /ny felanmälan/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
