import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminEconomyPage } from '@/features/economy/AdminEconomyPage';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminEconomyPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('lists every seeded invoice with its period', async () => {
    renderWithProviders(<AdminEconomyPage />, { route: '/admin/economy' });
    await waitFor(() => expect(screen.getByText('2026-03')).toBeInTheDocument());
    expect(screen.getByText('2026-04')).toBeInTheDocument();
    expect(screen.getAllByText('2026-06').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the unpaid total label', async () => {
    renderWithProviders(<AdminEconomyPage />, { route: '/admin/economy' });
    // 3 unpaid invoices × 4200 = 12600 kr — wait for data to load
    await waitFor(() => expect(screen.getByText('12600 kr')).toBeInTheDocument());
    expect(screen.getByText(/obetalt totalt/i)).toBeInTheDocument();
  });
});
