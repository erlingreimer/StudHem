import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorModeProvider, useColorMode } from '@/theme/ColorModeContext';

function Probe() {
  const { mode, toggle } = useColorMode();
  return <button onClick={toggle}>mode:{mode}</button>;
}

describe('ColorModeContext', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to light and toggles to dark, persisting the choice', async () => {
    render(<ColorModeProvider><Probe /></ColorModeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('mode:light');
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('mode:dark');
    expect(localStorage.getItem('studhem.v1.colorMode')).toBe('dark');
  });

  it('reads the persisted mode on init', () => {
    localStorage.setItem('studhem.v1.colorMode', 'dark');
    render(<ColorModeProvider><Probe /></ColorModeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('mode:dark');
  });
});
