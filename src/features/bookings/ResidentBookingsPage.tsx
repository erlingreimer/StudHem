import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import dayjs from 'dayjs';
import type { Facility, Property } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { readCollection } from '@/services/mock/storage';
import {
  useBookingsByFacility, useBookingsByResident, useCancelBooking, useCreateBooking,
} from '@/services/hooks/bookings';
import { BookingSlotGrid } from './BookingSlotGrid';

export function ResidentBookingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const myBuildingId = useMemo(() => {
    if (!user) return undefined;
    return readCollection<Property>('properties', []).find((p) => p.residentId === user.id)?.buildingId;
  }, [user]);

  const facilities = useMemo(
    () =>
      readCollection<Facility>('facilities', []).filter(
        (f) => f.buildingId === myBuildingId,
      ),
    [myBuildingId],
  );

  const [facilityId, setFacilityId] = useState<string>(facilities[0]?.id ?? '');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const facility = facilities.find((f) => f.id === facilityId);
  const facilityBookings = useBookingsByFacility(facilityId || undefined);
  const myBookings = useBookingsByResident(user?.id);
  const createBooking = useCreateBooking();
  const cancelBooking = useCancelBooking();

  async function book(slot: { start: string; end: string }) {
    if (!facility || !user) return;
    setErrorMsg(null);
    try {
      await createBooking.mutateAsync({
        facilityType: facility.type,
        facilityId: facility.id,
        bookedById: user.id,
        start: slot.start,
        end: slot.end,
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'booking_overlap') setErrorMsg(t('bookings.errorOverlap'));
      else if (msg === 'booking_limit') setErrorMsg(t('bookings.errorLimit'));
      else setErrorMsg(msg);
    }
  }

  if (!myBuildingId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 2 }}>{t('bookings.title')}</Typography>
        <Typography color="text.secondary">{t('bookings.noFacilities')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('bookings.title')}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2 }}>
        <TextField
          select
          label={t('bookings.selectFacility')}
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {facilities.map((f) => (
            <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label={t('bookings.selectDate')}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      {errorMsg && <Alert severity="warning" sx={{ mb: 2 }}>{errorMsg}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>{facility?.label}</Typography>
          {facilityBookings.isLoading || !facility
            ? <Skeleton variant="rectangular" height={200} />
            : <BookingSlotGrid
                facilityType={facility.type}
                date={date}
                existing={facilityBookings.data ?? []}
                currentUserId={user?.id ?? ''}
                onBook={book}
                bookDisabled={createBooking.isPending}
              />}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>{t('bookings.myTitle')}</Typography>
      {myBookings.isLoading
        ? <Skeleton variant="rectangular" height={120} />
        : (myBookings.data ?? []).length === 0
          ? <Typography color="text.secondary">{t('bookings.empty')}</Typography>
          : (
            <Stack sx={{ gap: 1 }}>
              {(myBookings.data ?? []).map((b) => (
                <Card key={b.id}>
                  <CardContent>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t(`bookings.types.${b.facilityType}`)}
                        </Typography>
                        <Typography>
                          {b.start.slice(0, 10)} {b.start.slice(11, 16)}–{b.end.slice(11, 16)}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => cancelBooking.mutateAsync(b.id)}
                      >
                        {t('bookings.cancel')}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
    </Box>
  );
}
