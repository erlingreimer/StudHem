import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Invoice } from '@/types';
import { StatusChip } from '@/components/StatusChip';
import { useInvoices, useSendReminder } from '@/services/hooks/economy';
import { useProperties } from '@/services/hooks/properties';
import { useUsers } from '@/services/hooks/users';
import { readCollection } from '@/services/mock/storage';

interface ContractContext {
  propertyName?: string;
  residentName?: string;
}

export function AdminEconomyPage() {
  const { t } = useTranslation();
  const invoices = useInvoices();
  const properties = useProperties();
  const users = useUsers();
  const reminder = useSendReminder();
  const [snack, setSnack] = useState(false);

  const propertyByContract = useMemo(() => {
    const map = new Map<string, ContractContext>();
    const usersById = new Map(users.data?.map((u) => [u.id, u]) ?? []);
    const propertiesById = new Map(properties.data?.map((p) => [p.id, p]) ?? []);
    const contracts =
      readCollection<{ id: string; propertyId: string; residentId: string }>('contracts', []);
    for (const c of contracts) {
      map.set(c.id, {
        propertyName: propertiesById.get(c.propertyId)?.name,
        residentName: usersById.get(c.residentId)?.name,
      });
    }
    return map;
  }, [properties.data, users.data]);

  const rows = invoices.data ?? [];
  const unpaidTotal = rows
    .filter((r) => r.status !== 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const columns: GridColDef<Invoice>[] = [
    { field: 'period', headerName: t('economy.period'), width: 120 },
    {
      field: 'property',
      headerName: t('maintenance.property'),
      flex: 1,
      renderCell: (p) => propertyByContract.get(p.row.contractId)?.propertyName ?? p.row.contractId,
      sortable: false,
    },
    {
      field: 'resident',
      headerName: t('maintenance.resident'),
      flex: 1,
      renderCell: (p) => propertyByContract.get(p.row.contractId)?.residentName ?? '—',
      sortable: false,
    },
    {
      field: 'amount',
      headerName: t('economy.amount'),
      width: 120,
      valueFormatter: (value: number) => `${value} kr`,
    },
    { field: 'dueDate', headerName: t('economy.dueDate'), width: 140 },
    {
      field: 'status',
      headerName: t('economy.status'),
      width: 140,
      renderCell: (p) => <StatusChip kind="invoice" value={p.row.status} />,
    },
    {
      field: 'actions',
      headerName: ' ',
      width: 220,
      sortable: false,
      filterable: false,
      renderCell: (p) =>
        p.row.status !== 'paid' ? (
          <Button
            size="small"
            onClick={async () => {
              await reminder.mutateAsync(p.row.id);
              setSnack(true);
            }}
          >
            {t('economy.sendReminder')}
          </Button>
        ) : null,
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('economy.title')}</Typography>
        <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1 }}>
          <Typography variant="overline" color="text.secondary">
            {t('economy.totalUnpaid')}:
          </Typography>
          <Typography variant="h6">{unpaidTotal} kr</Typography>
        </Stack>
      </Stack>
      {invoices.isLoading
        ? <Skeleton variant="rectangular" height={400} />
        : <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            localeText={rows.length === 0 ? { noRowsLabel: t('economy.empty') } : undefined}
          />}
      <Snackbar
        open={snack}
        autoHideDuration={2500}
        onClose={() => setSnack(false)}
        message={t('economy.reminderSent')}
      />
    </Box>
  );
}
