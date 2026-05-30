import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaintenanceCreateInput } from '@/services/api';
import type { MaintenanceStatus } from '@/types';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useMaintenanceRequests() {
  return useQuery({
    queryKey: keys.maintenance(),
    queryFn: () => api.maintenance.list(),
  });
}

export function useMaintenanceByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId
      ? keys.maintenanceByResident(residentId)
      : ['maintenance', 'byResident', 'none'],
    queryFn: () => api.maintenance.byResident(residentId as string),
    enabled: Boolean(residentId),
  });
}

export function useMaintenanceByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId
      ? keys.maintenanceByProperty(propertyId)
      : ['maintenance', 'byProperty', 'none'],
    queryFn: () => api.maintenance.byProperty(propertyId as string),
    enabled: Boolean(propertyId),
  });
}

export function useMaintenanceRequest(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.maintenanceRequest(id) : ['maintenance', 'none'],
    queryFn: async () => (await api.maintenance.get(id as string)) ?? null,
    enabled: Boolean(id),
  });
}

export function useCreateMaintenanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MaintenanceCreateInput) => api.maintenance.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.maintenance() }),
  });
}

export function useUpdateMaintenanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: MaintenanceStatus; note?: string }) =>
      api.maintenance.updateStatus(id, status, note),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.maintenance() });
      qc.invalidateQueries({ queryKey: keys.maintenanceRequest(row.id) });
    },
  });
}

export function useAssignMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, staffUserId }: { id: string; staffUserId: string | undefined }) =>
      api.maintenance.assign(id, staffUserId),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.maintenance() });
      qc.invalidateQueries({ queryKey: keys.maintenanceRequest(row.id) });
    },
  });
}
