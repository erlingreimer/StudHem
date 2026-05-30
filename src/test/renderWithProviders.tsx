import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { ColorModeProvider } from '@/theme/ColorModeContext';
import { AuthProvider } from '@/auth/AuthContext';
import i18n from '@/i18n';

interface Options {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, { route = '/' }: Options = {}): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ColorModeProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </AuthProvider>
        </ColorModeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
}
