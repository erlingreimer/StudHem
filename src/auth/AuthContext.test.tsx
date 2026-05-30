import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { seedDatabase } from '@/services/mock/seed';

function Probe() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="who">{user ? `${user.username}:${user.role}` : 'none'}</span>
      <button onClick={() => login('admin', 'admin123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('logs in, exposes the user, and persists the session', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('who')).toHaveTextContent('none');
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('admin:admin'));
    expect(localStorage.getItem('studhem.v1.session')).toContain('admin');
  });

  it('restores the session on mount', () => {
    localStorage.setItem(
      'studhem.v1.session',
      JSON.stringify({ id: 'u-admin', username: 'admin', role: 'admin', name: 'A', email: 'a@a.se', status: 'active' }),
    );
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('who')).toHaveTextContent('admin:admin');
  });

  it('clears the session on logout', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('admin:admin'));
    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('who')).toHaveTextContent('none');
    expect(localStorage.getItem('studhem.v1.session')).toBeNull();
  });
});
