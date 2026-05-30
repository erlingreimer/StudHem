import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Property } from '@/types';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useProperties() {
  return useQuery({ queryKey: keys.properties(), queryFn: () => api.properties.list() });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.property(id) : ['properties', 'none'],
    queryFn: async () => (await api.properties.get(id as string)) ?? null,
    enabled: Boolean(id),
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Property, 'id'>) => api.properties.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.properties() }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Property, 'id'>> }) =>
      api.properties.update(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.properties() });
      qc.invalidateQueries({ queryKey: keys.property(row.id) });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.properties.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.properties() }),
  });
}
