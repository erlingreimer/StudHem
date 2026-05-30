import type { ContractsApi } from '@/services/api';
import type { Contract } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { readCollection } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createContractsService(): ContractsApi {
  return {
    async byPropertyId(propertyId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Contract>('contracts', []).find(
        (c) => c.propertyId === propertyId && c.status !== 'ended',
      );
    },
  };
}
