import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminMaintenancePage } from '@/features/maintenance/AdminMaintenancePage';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminMaintenancePage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('lists every seeded request', async () => {
    renderWithProviders(<AdminMaintenancePage />, { route: '/admin/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    expect(screen.getByText(/kylskåpet fryser/i)).toBeInTheDocument();
    expect(screen.getByText(/låset hakar upp/i)).toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderWithProviders(<AdminMaintenancePage />, { route: '/admin/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/^status$/i));
    await userEvent.click(screen.getByRole('option', { name: /^löst$/i }));
    await waitFor(() => expect(screen.queryByText(/vattenkran droppar/i)).not.toBeInTheDocument());
    expect(screen.getByText(/låset hakar upp/i)).toBeInTheDocument();
  });
});
