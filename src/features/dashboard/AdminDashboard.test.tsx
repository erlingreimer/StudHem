import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { seedDatabase } from '@/services/mock/seed';

describe('AdminDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('shows the property count and occupancy from seeded data', async () => {
    renderWithProviders(<AdminDashboard />, { route: '/admin' });
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });
});
