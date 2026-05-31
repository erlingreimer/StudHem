import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useContractByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId ? keys.contractByProperty(propertyId) : ['contracts', 'none'],
    queryFn: async () => (await api.contracts.byPropertyId(propertyId as string)) ?? null,
    enabled: Boolean(propertyId),
  });
}

export function useContractByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId
      ? keys.contractByResident(residentId)
      : ['contracts', 'byResident', 'none'],
    queryFn: async () => (await api.contracts.byResidentId(residentId as string)) ?? null,
    enabled: Boolean(residentId),
  });
}

export function useGiveNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, moveOutDate }: { contractId: string; moveOutDate: string }) =>
      api.contracts.giveNotice(contractId, moveOutDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useMarkMovedOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => api.contracts.markMovedOut(contractId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
