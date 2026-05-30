import type { MaintenanceApi, MaintenanceCreateInput } from '@/services/api';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateId(): string {
  return `mr-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMaintenanceService(): MaintenanceApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      return readCollection<MaintenanceRequest>('maintenance', []);
    },
    async byResident(residentId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<MaintenanceRequest>('maintenance', []).filter(
        (r) => r.residentId === residentId,
      );
    },
    async byProperty(propertyId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<MaintenanceRequest>('maintenance', []).filter(
        (r) => r.propertyId === propertyId,
      );
    },
    async get(id) {
      await delay(MOCK_LATENCY_MS);
      return byId<MaintenanceRequest>('maintenance', id);
    },
    async create(input: MaintenanceCreateInput) {
      await delay(MOCK_LATENCY_MS);
      const now = new Date().toISOString();
      const row: MaintenanceRequest = {
        id: generateId(),
        propertyId: input.propertyId,
        residentId: input.residentId,
        category: input.category,
        description: input.description,
        photoUrls: input.photoUrls,
        status: 'received',
        createdAt: now,
        history: [{ status: 'received', at: now }],
      };
      upsertById<MaintenanceRequest>('maintenance', row);
      return row;
    },
    async updateStatus(id, status: MaintenanceStatus, note) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<MaintenanceRequest>('maintenance', id);
      if (!existing) throw new Error(`maintenance_not_found:${id}`);
      const at = new Date().toISOString();
      const updated: MaintenanceRequest = {
        ...existing,
        status,
        history: [...existing.history, { status, at, note }],
      };
      upsertById<MaintenanceRequest>('maintenance', updated);
      return updated;
    },
    async assign(id, staffUserId) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<MaintenanceRequest>('maintenance', id);
      if (!existing) throw new Error(`maintenance_not_found:${id}`);
      const updated: MaintenanceRequest = { ...existing, assignedTo: staffUserId };
      upsertById<MaintenanceRequest>('maintenance', updated);
      return updated;
    },
  };
}
