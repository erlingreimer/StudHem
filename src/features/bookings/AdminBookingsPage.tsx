import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Booking, Facility } from '@/types';
import { useBookings, useCancelBooking } from '@/services/hooks/bookings';
import { useUsers } from '@/services/hooks/users';
import { readCollection } from '@/services/mock/storage';

export function AdminBookingsPage() {
  const { t } = useTranslation();
  const bookings = useBookings();
  const users = useUsers();
  const cancel = useCancelBooking();

  const userById = useMemo(
    () => new Map(users.data?.map((u) => [u.id, u]) ?? []),
    [users.data],
  );
  const facilityById = useMemo(
    () => new Map(readCollection<Facility>('facilities', []).map((f) => [f.id, f])),
    [],
  );

  const columns: GridColDef<Booking>[] = [
    {
      field: 'facilityType',
      headerName: t('bookings.facilityType'),
      width: 160,
      renderCell: (p) => t(`bookings.types.${p.row.facilityType}`),
    },
    {
      field: 'facilityId',
      headerName: t('bookings.facility'),
      flex: 1,
      renderCell: (p) => facilityById.get(p.row.facilityId)?.label ?? p.row.facilityId,
    },
    {
      field: 'bookedById',
      headerName: t('bookings.bookedBy'),
      width: 180,
      renderCell: (p) => userById.get(p.row.bookedById)?.name ?? p.row.bookedById,
    },
    {
      field: 'start',
      headerName: t('bookings.start'),
      width: 180,
      valueFormatter: (value: string) => value.replace('T', ' ').slice(0, 16),
    },
    {
      field: 'end',
      headerName: t('bookings.end'),
      width: 180,
      valueFormatter: (value: string) => value.replace('T', ' ').slice(0, 16),
    },
    {
      field: 'actions',
      headerName: ' ',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Button size="small" color="error" onClick={() => cancel.mutateAsync(p.row.id)}>
          {t('bookings.cancel')}
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('bookings.title')}</Typography>
      </Stack>
      {bookings.isLoading
        ? <Skeleton variant="rectangular" height={400} />
        : <DataGrid
            autoHeight
            rows={bookings.data ?? []}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            localeText={(bookings.data ?? []).length === 0 ? { noRowsLabel: t('bookings.empty') } : undefined}
          />}
    </Box>
  );
}
