import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ResidentLayout } from '@/components/ResidentLayout';

function Tree() {
  return (
    <Routes>
      <Route element={<ResidentLayout />}>
        <Route path="/home" element={<div>HOME CONTENT</div>} />
        <Route path="/maintenance" element={<div>MAINT CONTENT</div>} />
      </Route>
    </Routes>
  );
}

describe('ResidentLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('renders the active route and the bottom nav', () => {
    renderWithProviders(<Tree />, { route: '/home' });
    expect(screen.getByText('HOME CONTENT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hem/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /felanmälningar/i })).toBeInTheDocument();
  });
});
