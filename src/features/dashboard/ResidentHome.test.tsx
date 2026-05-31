import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { seedDatabase } from '@/services/mock/seed';

describe('ResidentHome / My housing', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('shows my property and contract details', async () => {
    renderWithProviders(<ResidentHome />, { route: '/home' });
    await waitFor(() => expect(screen.getByText(/rum 101/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/2026-01-01/)).toBeInTheDocument());
  });

  it('rejects a notice inside the 2-month window with a translated alert', async () => {
    renderWithProviders(<ResidentHome />, { route: '/home' });
    await waitFor(() => expect(screen.getByText(/rum 101/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /säg upp/i }));
    const dialog = await screen.findByRole('dialog');
    const tooSoon = dayjs().add(1, 'month').format('YYYY-MM-DD');
    const input = dialog.querySelector('input[type="date"]')! as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, tooSoon);
    await userEvent.click(screen.getByRole('button', { name: /bekräfta uppsägning/i }));
    expect(await screen.findByText(/inom uppsägningstiden/i)).toBeInTheDocument();
  });

  it('gives notice with a valid date and shows the "vacating" chip', async () => {
    renderWithProviders(<ResidentHome />, { route: '/home' });
    await waitFor(() => expect(screen.getByText(/rum 101/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /säg upp/i }));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: /bekräfta uppsägning/i }));
    await waitFor(() =>
      expect(screen.getByText(/flyttar ut/i)).toBeInTheDocument(),
    );
  });
});
