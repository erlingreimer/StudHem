import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Property, PropertyStatus } from '@/types';
import { useProperties } from '@/services/hooks/properties';
import { StatusChip } from '@/components/StatusChip';
import { PropertyFormDialog } from './PropertyFormDialog';

type StatusFilter = 'all' | PropertyStatus;

export function PropertiesPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useProperties();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [creating, setCreating] = useState(false);

  const rows = useMemo<Property[]>(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (!term) return true;
      return (
        row.name.toLowerCase().includes(term) ||
        row.address.toLowerCase().includes(term) ||
        row.roomType.toLowerCase().includes(term)
      );
    });
  }, [data, search, status]);

  const columns = useMemo<GridColDef<Property>[]>(
    () => [
      { field: 'name', headerName: t('properties.name'), flex: 1 },
      { field: 'address', headerName: t('properties.address'), flex: 1 },
      { field: 'roomType', headerName: t('properties.roomType'), flex: 1 },
      {
        field: 'rent',
        headerName: t('properties.rent'),
        width: 120,
        valueFormatter: (value: number) => `${value} kr`,
      },
      {
        field: 'status',
        headerName: t('properties.status'),
        width: 140,
        renderCell: (params) => <StatusChip kind="property" value={params.row.status} />,
      },
      {
        field: 'actions',
        headerName: t('properties.actions'),
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton
            component={RouterLink}
            to={`/admin/properties/${params.row.id}`}
            aria-label={t('properties.actions')}
            size="small"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [t],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('properties.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          {t('properties.new')}
        </Button>
      </Stack>

      <Stack direction="row" sx={{ mb: 2, gap: 2 }}>
        <TextField
          label={t('properties.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label={t('properties.statusFilter')}
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          sx={{ width: 220 }}
        >
          <MenuItem value="all">{t('properties.all')}</MenuItem>
          <MenuItem value="vacant">{t('status.property.vacant')}</MenuItem>
          <MenuItem value="occupied">{t('status.property.occupied')}</MenuItem>
        </TextField>
      </Stack>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>{t('properties.loadError')}</Alert>}
      {isLoading && <Skeleton variant="rectangular" height={400} />}

      {!isLoading && (
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          localeText={rows.length === 0 ? { noRowsLabel: t('properties.empty') } : undefined}
        />
      )}

      <PropertyFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
      />
    </Box>
  );
}
