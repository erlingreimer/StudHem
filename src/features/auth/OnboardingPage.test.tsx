import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { OnboardingPage } from '@/features/auth/OnboardingPage';
import { seedDatabase } from '@/services/mock/seed';

function Tree() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/home" element={<div>RESIDENT HOME</div>} />
    </Routes>
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify({
      id: 'u-pending', name: 'Pia Pending', email: 'pia@student.se', username: 'pending',
      role: 'resident', status: 'pending',
    }));
  });

  it('rejects mismatched passwords', async () => {
    renderWithProviders(<Tree />, { route: '/onboarding' });
    await userEvent.type(screen.getByLabelText(/nytt lösenord/i), 'password1');
    await userEvent.type(screen.getByLabelText(/bekräfta lösenord/i), 'different1');
    await userEvent.click(screen.getByRole('button', { name: /spara och fortsätt/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/lösenorden matchar inte/i);
  });

  it('saves the password, flips status to active, and routes to /home', async () => {
    renderWithProviders(<Tree />, { route: '/onboarding' });
    await userEvent.type(screen.getByLabelText(/nytt lösenord/i), 'password1');
    await userEvent.type(screen.getByLabelText(/bekräfta lösenord/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /spara och fortsätt/i }));
    await waitFor(() => expect(screen.getByText('RESIDENT HOME')).toBeInTheDocument());
  });
});
