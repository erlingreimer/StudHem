import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useInvoices() {
  return useQuery({ queryKey: keys.invoices(), queryFn: () => api.economy.list() });
}

export function useInvoicesByResident(residentId: string | undefined) {
  return useQuery({
    queryKey: residentId
      ? keys.invoicesByResident(residentId)
      : ['invoices', 'byResident', 'none'],
    queryFn: () => api.economy.byResident(residentId as string),
    enabled: Boolean(residentId),
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => api.economy.markPaid(invoiceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useSendReminder() {
  return useMutation({
    mutationFn: (invoiceId: string) => api.economy.sendReminder(invoiceId),
  });
}
