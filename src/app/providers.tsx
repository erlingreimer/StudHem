import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/sv';
import { ColorModeProvider } from '@/theme/ColorModeContext';
import { AuthProvider } from '@/auth/AuthContext';
import i18n from '@/i18n';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="sv">
            <AuthProvider>{children}</AuthProvider>
          </LocalizationProvider>
        </ColorModeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
