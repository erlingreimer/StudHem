import { useQuery } from '@tanstack/react-query';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useContractByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId ? keys.contractByProperty(propertyId) : ['contracts', 'none'],
    queryFn: () => api.contracts.byPropertyId(propertyId as string),
    enabled: Boolean(propertyId),
  });
}
