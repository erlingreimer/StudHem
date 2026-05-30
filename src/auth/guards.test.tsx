import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequireAuth, RequireRole } from '@/auth/guards';

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<div>LOGIN</div>} />
      <Route path="/home" element={<div>RESIDENT HOME</div>} />
      <Route
        path="/admin"
        element={<RequireRole roles={['admin', 'staff']}><div>ADMIN</div></RequireRole>}
      />
      <Route
        path="/secret"
        element={<RequireAuth><div>SECRET</div></RequireAuth>}
      />
    </Routes>
  );
}

describe('route guards', () => {
  beforeEach(() => localStorage.clear());

  it('redirects an unauthenticated user to /login', () => {
    renderWithProviders(<Tree />, { route: '/secret' });
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('blocks a resident from an admin route and sends them to their home', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' }),
    );
    renderWithProviders(<Tree />, { route: '/admin' });
    expect(screen.getByText('RESIDENT HOME')).toBeInTheDocument();
  });

  it('allows an admin into an admin route', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' }),
    );
    renderWithProviders(<Tree />, { route: '/admin' });
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});
