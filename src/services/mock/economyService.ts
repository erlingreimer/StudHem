import type { EconomyApi } from '@/services/api';
import type { Contract, Invoice } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function deriveStatus(row: Invoice, todayDate: string): Invoice {
  if (row.status === 'paid') return row;
  if (row.dueDate < todayDate) return { ...row, status: 'overdue' };
  return row;
}

export function createEconomyService(): EconomyApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      const todayDate = today();
      return readCollection<Invoice>('invoices', []).map((r) => deriveStatus(r, todayDate));
    },
    async byContractId(contractId) {
      await delay(MOCK_LATENCY_MS);
      const todayDate = today();
      return readCollection<Invoice>('invoices', [])
        .filter((r) => r.contractId === contractId)
        .map((r) => deriveStatus(r, todayDate));
    },
    async byResident(residentId) {
      await delay(MOCK_LATENCY_MS);
      const todayDate = today();
      const contractIds = new Set(
        readCollection<Contract>('contracts', [])
          .filter((c) => c.residentId === residentId)
          .map((c) => c.id),
      );
      return readCollection<Invoice>('invoices', [])
        .filter((r) => contractIds.has(r.contractId))
        .map((r) => deriveStatus(r, todayDate));
    },
    async markPaid(invoiceId) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Invoice>('invoices', invoiceId);
      if (!existing) throw new Error(`invoice_not_found:${invoiceId}`);
      const updated: Invoice = {
        ...existing,
        status: 'paid',
        paidAt: new Date().toISOString(),
      };
      upsertById<Invoice>('invoices', updated);
      return updated;
    },
    async sendReminder(_invoiceId) {
      await delay(MOCK_LATENCY_MS);
      // intentional no-op
    },
  };
}
