import type { ContractsApi, MarkMovedOutResult } from '@/services/api';
import type { Contract, Property } from '@/types';
import { MOCK_LATENCY_MS, NOTICE_PERIOD_MONTHS } from '@/config/constants';
import dayjs from 'dayjs';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createContractsService(): ContractsApi {
  return {
    async byPropertyId(propertyId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Contract>('contracts', []).find(
        (c) => c.propertyId === propertyId && c.status !== 'ended',
      );
    },
    async byResidentId(residentId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Contract>('contracts', []).find(
        (c) => c.residentId === residentId && c.status !== 'ended',
      );
    },
    async giveNotice(contractId, moveOutDate) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Contract>('contracts', contractId);
      if (!existing) throw new Error(`contract_not_found:${contractId}`);
      const monthsFromNow = dayjs(moveOutDate).diff(dayjs(), 'month', true);
      if (monthsFromNow < NOTICE_PERIOD_MONTHS) {
        throw new Error('notice_too_short');
      }
      const updated: Contract = {
        ...existing,
        status: 'notice_given',
        endDate: moveOutDate,
        noticeGivenAt: new Date().toISOString(),
      };
      upsertById<Contract>('contracts', updated);
      return updated;
    },
    async markMovedOut(contractId): Promise<MarkMovedOutResult> {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<Contract>('contracts', contractId);
      if (!existing) throw new Error(`contract_not_found:${contractId}`);
      if (existing.status !== 'notice_given') {
        throw new Error('contract_not_in_notice');
      }
      const contract: Contract = { ...existing, status: 'ended' };
      upsertById<Contract>('contracts', contract);

      const property = byId<Property>('properties', existing.propertyId);
      if (!property) throw new Error(`property_not_found:${existing.propertyId}`);
      const updatedProperty: Property = {
        ...property,
        status: 'vacant',
        residentId: undefined,
      };
      upsertById<Property>('properties', updatedProperty);

      return { contract, property: updatedProperty };
    },
  };
}
