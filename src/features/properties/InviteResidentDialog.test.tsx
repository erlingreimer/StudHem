import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/admin/properties/:id" element={<PropertyDetailPage />} />
    </Routes>
  );
}

describe('InviteResidentDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('creates a pending resident, marks the property occupied, and reveals the temp password', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/p-103' });
    await waitFor(() => expect(screen.getByRole('heading', { name: /rum 103/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /bjud in boende/i }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(dialog.querySelector('input[name="name"]')!, 'Nora New');
    await userEvent.type(dialog.querySelector('input[name="email"]')!, 'nora@student.se');
    await userEvent.click(screen.getByRole('button', { name: /skicka inbjudan/i }));

    await waitFor(() =>
      expect(screen.getByText(/inbjudan skapad/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/temp-/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /klart/i }));

    await waitFor(() => expect(screen.getByText(/nora new/i)).toBeInTheDocument());
  });
});
