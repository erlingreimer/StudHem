import { useQuery } from '@tanstack/react-query';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useContractByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId ? keys.contractByProperty(propertyId) : ['contracts', 'none'],
    queryFn: async () => (await api.contracts.byPropertyId(propertyId as string)) ?? null,
    enabled: Boolean(propertyId),
  });
}
