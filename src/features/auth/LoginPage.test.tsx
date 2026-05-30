import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from '@/features/auth/LoginPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<div>ADMIN DASHBOARD</div>} />
      <Route path="/home" element={<div>RESIDENT HOME</div>} />
    </Routes>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('logs an admin in and redirects to the admin dashboard', async () => {
    renderWithProviders(<Tree />, { route: '/login' });
    await userEvent.type(screen.getByLabelText(/användarnamn/i), 'admin');
    await userEvent.type(screen.getByLabelText(/lösenord/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /logga in/i }));
    await waitFor(() => expect(screen.getByText('ADMIN DASHBOARD')).toBeInTheDocument());
  });

  it('shows an error on bad credentials', async () => {
    renderWithProviders(<Tree />, { route: '/login' });
    await userEvent.type(screen.getByLabelText(/användarnamn/i), 'admin');
    await userEvent.type(screen.getByLabelText(/lösenord/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /logga in/i }));
    await waitFor(() =>
      expect(screen.getByText(/fel användarnamn eller lösenord/i)).toBeInTheDocument(),
    );
  });
});
