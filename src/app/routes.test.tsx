import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from '@/app/routes';
import { seedDatabase } from '@/services/mock/seed';

describe('AppRoutes', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('redirects an unknown route to /login when logged out', async () => {
    renderWithProviders(<AppRoutes />, { route: '/totally-unknown' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /logga in/i })).toBeInTheDocument(),
    );
  });

  it('lands an admin on the admin dashboard at /admin', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/admin' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /översikt/i })).toBeInTheDocument(),
    );
  });

  it('renders the properties page at /admin/properties', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/admin/properties' });
    await waitFor(() => expect(screen.getByText('Rum 101')).toBeInTheDocument());
  });

  it('routes a pending resident to /onboarding regardless of target', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-pending', username: 'pending', role: 'resident', name: 'P', email: 'p@p.se', status: 'pending' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/home' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /välkommen/i })).toBeInTheDocument(),
    );
  });

  it('lands a resident on resident home', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/home' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^hem$/i })).toBeInTheDocument(),
    );
  });

  it('renders the admin maintenance page', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/admin/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
  });

  it('renders the resident maintenance page under the resident layout', async () => {
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
    renderWithProviders(<AppRoutes />, { route: '/maintenance' });
    await waitFor(() => expect(screen.getByText(/vattenkran droppar/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /felanmälningar/i })).toBeInTheDocument();
  });
});
