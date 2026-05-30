import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/admin/properties/:id" element={<PropertyDetailPage />} />
      <Route path="/admin/properties" element={<div>LIST</div>} />
    </Routes>
  );
}

describe('PropertyDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('renders the property info and the current resident', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/p-101' });
    await waitFor(() => expect(screen.getByRole('heading', { name: /rum 101/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/rasmus resident/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/standardvillkor/i)).toBeInTheDocument());
  });

  it('renders "no resident" / "no contract" for a vacant property', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/p-103' });
    await waitFor(() => expect(screen.getByRole('heading', { name: /rum 103/i })).toBeInTheDocument());
    expect(screen.getByText(/ingen boende/i)).toBeInTheDocument();
    expect(screen.getByText(/inget kontrakt/i)).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown id', async () => {
    renderWithProviders(<Tree />, { route: '/admin/properties/does-not-exist' });
    await waitFor(() =>
      expect(screen.getByText(/kunde inte hittas/i)).toBeInTheDocument(),
    );
  });
});
