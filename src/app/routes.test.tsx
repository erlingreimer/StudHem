import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from '@/app/routes';

describe('AppRoutes', () => {
  beforeEach(() => localStorage.clear());

  it('redirects an unknown route to /login when logged out', async () => {
    renderWithProviders(<AppRoutes />, { route: '/totally-unknown' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /logga in/i })).toBeInTheDocument(),
    );
  });

  it('lands an admin on the admin dashboard', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' }),
    );
    renderWithProviders(<AppRoutes />, { route: '/admin' });
    expect(screen.getByText(/adminpanel/i)).toBeInTheDocument();
  });

  it('lands a resident on resident home', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' }),
    );
    renderWithProviders(<AppRoutes />, { route: '/home' });
    expect(screen.getByText(/^hem$/i)).toBeInTheDocument();
  });
});
