import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { Booking, FacilityType } from '@/types';
import { generateSlots, type Slot } from './slotGeneration';

interface Props {
  facilityType: FacilityType;
  date: string;
  existing: Booking[];
  currentUserId: string;
  onBook: (slot: Slot) => void;
  bookDisabled?: boolean;
}

function statusFor(slot: Slot, existing: Booking[], currentUserId: string) {
  const conflict = existing.find(
    (b) => b.start < slot.end && slot.start < b.end,
  );
  if (!conflict) return 'available' as const;
  return conflict.bookedById === currentUserId ? ('mine' as const) : ('taken' as const);
}

export function BookingSlotGrid({
  facilityType, date, existing, currentUserId, onBook, bookDisabled,
}: Props) {
  const { t } = useTranslation();
  const slots = useMemo(() => generateSlots(facilityType, date), [facilityType, date]);
  return (
    <Stack sx={{ gap: 1 }}>
      {slots.map((slot) => {
        const status = statusFor(slot, existing, currentUserId);
        const time = `${slot.start.slice(11, 16)}–${slot.end.slice(11, 16)}`;
        return (
          <Stack key={slot.start} direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <Typography sx={{ width: 120 }}>{time}</Typography>
            {status === 'available' && (
              <Button
                variant="contained"
                size="small"
                disabled={bookDisabled}
                onClick={() => onBook(slot)}
              >
                {t('bookings.book')}
              </Button>
            )}
            {status === 'mine' && (
              <Typography color="primary">{t('bookings.yourBooking')}</Typography>
            )}
            {status === 'taken' && (
              <Typography color="text.secondary">{t('bookings.taken')}</Typography>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
