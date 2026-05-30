import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequestDetailDialog } from '@/features/maintenance/RequestDetailDialog';
import { seedDatabase } from '@/services/mock/seed';

describe('RequestDetailDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
  });

  it('changes status to in_progress and shows the new history entry', async () => {
    renderWithProviders(
      <RequestDetailDialog requestId="mr-1" onClose={() => {}} />,
      { route: '/admin/maintenance' },
    );
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/ändra status/i));
    await userEvent.click(screen.getByRole('option', { name: /^pågår$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^spara$/i }));
    await waitFor(() => {
      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('assigns a staff member', async () => {
    renderWithProviders(
      <RequestDetailDialog requestId="mr-1" onClose={() => {}} />,
      { route: '/admin/maintenance' },
    );
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/^tilldela$/i));
    await userEvent.click(screen.getByRole('option', { name: /sven staff/i }));
    await waitFor(() => expect(screen.getByText(/sven staff/i)).toBeInTheDocument());
  });
});
