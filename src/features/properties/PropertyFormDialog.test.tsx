import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/admin/properties" element={<PropertiesPage />} />
    </Routes>
  );
}

describe('PropertyFormDialog (via list page)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('creates a new property and shows it in the grid', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /ny bostad/i }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(dialog.querySelector('input[name="name"]')!, 'Rum 999');
    await userEvent.type(dialog.querySelector('input[name="address"]')!, 'Testväg 9');
    await userEvent.type(dialog.querySelector('input[name="roomType"]')!, 'studio');
    await userEvent.type(dialog.querySelector('input[name="rent"]')!, '7000');
    await userEvent.click(screen.getByRole('button', { name: /^spara$/i }));

    await waitFor(() => expect(screen.getByText('Rum 999')).toBeInTheDocument());
  });

  it('shows validation when required fields are missing', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /ny bostad/i }));
    await userEvent.click(screen.getByRole('button', { name: /^spara$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
