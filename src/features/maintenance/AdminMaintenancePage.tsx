import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types';
import { useMaintenanceRequests } from '@/services/hooks/maintenance';
import { useUsers } from '@/services/hooks/users';
import { useProperties } from '@/services/hooks/properties';
import { StatusChip } from '@/components/StatusChip';
import { RequestDetailDialog } from './RequestDetailDialog';

type StatusFilter = 'all' | MaintenanceStatus;

export function AdminMaintenancePage() {
  const { t } = useTranslation();
  const requests = useMaintenanceRequests();
  const users = useUsers();
  const properties = useProperties();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const userById = useMemo(
    () => new Map(users.data?.map((u) => [u.id, u]) ?? []),
    [users.data],
  );

  const propertyById = useMemo(
    () => new Map(properties.data?.map((p) => [p.id, p]) ?? []),
    [properties.data],
  );

  const rows = useMemo(() => {
    const all = requests.data ?? [];
    if (statusFilter === 'all') return all;
    return all.filter((r) => r.status === statusFilter);
  }, [requests.data, statusFilter]);

  const columns = useMemo<GridColDef<MaintenanceRequest>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: t('maintenance.createdAt'),
        width: 120,
        valueFormatter: (value: string) => value.slice(0, 10),
      },
      {
        field: 'category',
        headerName: t('maintenance.category'),
        width: 130,
        valueFormatter: (value: string) => t(`maintenance.category_labels.${value}`),
      },
      {
        field: 'description',
        headerName: t('maintenance.description'),
        flex: 1,
      },
      {
        field: 'propertyId',
        headerName: t('maintenance.property'),
        width: 120,
        renderCell: (p) => propertyById.get(p.row.propertyId)?.name ?? p.row.propertyId,
      },
      {
        field: 'residentId',
        headerName: t('maintenance.resident'),
        width: 160,
        renderCell: (p) => userById.get(p.row.residentId)?.name ?? p.row.residentId,
      },
      {
        field: 'assignedTo',
        headerName: t('maintenance.assignee'),
        width: 140,
        renderCell: (p) =>
          p.row.assignedTo
            ? userById.get(p.row.assignedTo)?.name ?? p.row.assignedTo
            : t('maintenance.unassigned'),
      },
      {
        field: 'status',
        headerName: t('maintenance.title'),
        width: 140,
        renderCell: (p) => <StatusChip kind="maintenance" value={p.row.status} />,
      },
    ],
    [t, userById, propertyById],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('maintenance.title')}</Typography>
      </Stack>
      <Stack direction="row" sx={{ mb: 2, gap: 2 }}>
        <TextField
          select
          label={t('properties.status')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          sx={{ width: 220 }}
        >
          <MenuItem value="all">{t('properties.all')}</MenuItem>
          <MenuItem value="received">{t('status.maintenance.received')}</MenuItem>
          <MenuItem value="in_progress">{t('status.maintenance.in_progress')}</MenuItem>
          <MenuItem value="resolved">{t('status.maintenance.resolved')}</MenuItem>
        </TextField>
      </Stack>
      {requests.isLoading
        ? <Skeleton variant="rectangular" height={400} />
        : <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => setOpenId(p.row.id)}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            localeText={rows.length === 0 ? { noRowsLabel: t('maintenance.empty') } : undefined}
          />}
      <RequestDetailDialog
        requestId={openId}
        onClose={() => setOpenId(null)}
      />
    </Box>
  );
}
