import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBookingInput } from '@/services/api';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useBookings() {
  return useQuery({ queryKey: keys.bookings(), queryFn: () => api.bookings.list() });
}

export function useBookingsByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId
      ? keys.bookingsByResident(residentId)
      : ['bookings', 'byResident', 'none'],
    queryFn: () => api.bookings.byResident(residentId as string),
    enabled: Boolean(residentId),
  });
}

export function useBookingsByFacility(facilityId: string | undefined) {
  return useQuery({
    queryKey: facilityId
      ? keys.bookingsByFacility(facilityId)
      : ['bookings', 'byFacility', 'none'],
    queryFn: () => api.bookings.byFacility(facilityId as string),
    enabled: Boolean(facilityId),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.bookings.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.bookings.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
