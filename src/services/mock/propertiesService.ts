import type { PropertiesApi } from '@/services/api';
import type { Property } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, removeById, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateId(): string {
  return `p-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPropertiesService(): PropertiesApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Property>('properties', []);
    },
    async get(id) {
      await delay(MOCK_LATENCY_MS);
      return byId<Property>('properties', id);
    },
    async create(input) {
      await delay(MOCK_LATENCY_MS);
      const row: Property = { ...input, id: generateId() };
      upsertById<Property>('properties', row);
      return row;
    },
    async update(id, patch) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Property>('properties', id);
      if (!existing) throw new Error(`property_not_found:${id}`);
      const merged: Property = { ...existing, ...patch, id };
      upsertById<Property>('properties', merged);
      return merged;
    },
    async remove(id) {
      await delay(MOCK_LATENCY_MS);
      removeById<Property>('properties', id);
    },
  };
}
