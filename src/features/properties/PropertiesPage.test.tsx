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

describe('PropertiesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('renders the seeded rows', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    expect(screen.getByText('Studio 104')).toBeInTheDocument();
  });

  it('filters by search term', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/sök/i), 'Studio');
    await waitFor(() => expect(screen.queryByText('Rum 101')).not.toBeInTheDocument());
    expect(screen.getByText('Studio 104')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/^status$/i));
    await userEvent.click(screen.getByRole('option', { name: /uthyrt/i }));
    await waitFor(() => expect(screen.queryByText('Rum 103')).not.toBeInTheDocument());
    expect(screen.getByText('Rum 101')).toBeInTheDocument();
  });
});
