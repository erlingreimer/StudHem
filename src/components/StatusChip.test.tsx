import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ColorModeProvider } from '@/theme/ColorModeContext';
import { StatusChip } from '@/components/StatusChip';
import i18n from '@/i18n';

function inTheme(node: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ColorModeProvider>{node}</ColorModeProvider>
    </I18nextProvider>,
  );
}

describe('StatusChip', () => {
  it('renders property statuses with translated labels', () => {
    inTheme(<StatusChip kind="property" value="vacant" />);
    expect(screen.getByText(/ledigt|vacant/i)).toBeInTheDocument();
  });

  it('renders maintenance statuses', () => {
    inTheme(<StatusChip kind="maintenance" value="in_progress" />);
    expect(screen.getByText(/pågår|in progress/i)).toBeInTheDocument();
  });

  it('renders invoice statuses', () => {
    inTheme(<StatusChip kind="invoice" value="overdue" />);
    expect(screen.getByText(/försenad|overdue/i)).toBeInTheDocument();
  });
});
