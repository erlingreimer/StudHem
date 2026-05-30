import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import type { Invoice } from '@/types';
import { StatusChip } from '@/components/StatusChip';
import { useAuth } from '@/auth/AuthContext';
import { useInvoicesByResident, useMarkInvoicePaid } from '@/services/hooks/economy';

export function ResidentRentPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const invoices = useInvoicesByResident(user?.id);
  const pay = useMarkInvoicePaid();

  function sorted(rows: Invoice[]) {
    return [...rows].sort((a, b) => b.period.localeCompare(a.period));
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('economy.myTitle')}</Typography>
      {invoices.isLoading
        ? <Skeleton variant="rectangular" height={300} />
        : (
          <Stack sx={{ gap: 1 }}>
            {(invoices.data?.length ?? 0) === 0 && (
              <Typography color="text.secondary">{t('economy.empty')}</Typography>
            )}
            {sorted(invoices.data ?? []).map((row) => (
              <Card key={row.id}>
                <CardContent>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="overline" color="text.secondary">
                        {t('economy.period')}: {row.period}
                      </Typography>
                      <Typography variant="h6">{row.amount} kr</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('economy.dueDate')}: {row.dueDate}
                      </Typography>
                    </Box>
                    <StatusChip kind="invoice" value={row.status} />
                    {row.status !== 'paid' && (
                      <Button
                        variant="contained"
                        disabled={pay.isPending}
                        onClick={() => pay.mutateAsync(row.id)}
                      >
                        {t('economy.pay')}
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
    </Box>
  );
}
