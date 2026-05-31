import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { seedDatabase } from '@/services/mock/seed';
import { api } from '@/services';

describe('AdminDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('shows the property counts and live counts for maintenance and rent', async () => {
    renderWithProviders(<AdminDashboard />, { route: '/admin' });
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      // 2 open maintenance; 3 unpaid invoices
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows upcoming move-outs after a notice is given', async () => {
    const moveOut = dayjs().add(2, 'month').add(7, 'day').format('YYYY-MM-DD');
    await api.contracts.giveNotice('c-1', moveOut);

    renderWithProviders(<AdminDashboard />, { route: '/admin' });
    await waitFor(() => {
      // properties total still 8; upcoming move-outs is now 1
      const ones = screen.getAllByText('1');
      expect(ones.length).toBeGreaterThanOrEqual(1);
    });
  });
});
