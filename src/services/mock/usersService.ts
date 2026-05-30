import type { InviteInput, InviteResult, UsersApi } from '@/services/api';
import type { Contract, Property, SafeUser, User } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { byId, readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function stripPassword(u: User): SafeUser {
  const { password: _omit, ...safe } = u;
  return safe;
}

function generateUserId(): string {
  return `u-${Math.random().toString(36).slice(2, 8)}`;
}

function generateContractId(): string {
  return `c-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTempPassword(): string {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function deriveUsername(email: string, existing: User[]): string {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const taken = new Set(existing.map((u) => u.username));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i += 1;
  return `${base}${i}`;
}

export function createUsersService(): UsersApi {
  return {
    async list() {
      await delay(MOCK_LATENCY_MS);
      return readCollection<User>('users', []).map(stripPassword);
    },
    async get(id) {
      await delay(MOCK_LATENCY_MS);
      const u = byId<User>('users', id);
      return u ? stripPassword(u) : undefined;
    },
    async invite({ name, email, propertyId }: InviteInput): Promise<InviteResult> {
      await delay(MOCK_LATENCY_MS);
      const property = byId<Property>('properties', propertyId);
      if (!property) throw new Error(`property_not_found:${propertyId}`);
      if (property.status === 'occupied') throw new Error(`property_occupied:${propertyId}`);

      const allUsers = readCollection<User>('users', []);
      const username = deriveUsername(email, allUsers);
      const tempPassword = generateTempPassword();
      const newUser: User = {
        id: generateUserId(),
        name,
        email,
        username,
        role: 'resident',
        password: tempPassword,
        status: 'pending',
      };
      upsertById<User>('users', newUser);

      upsertById<Property>('properties', {
        ...property,
        status: 'occupied',
        residentId: newUser.id,
      });

      const today = new Date().toISOString().slice(0, 10);
      const contract: Contract = {
        id: generateContractId(),
        propertyId,
        residentId: newUser.id,
        startDate: today,
        rent: property.rent,
        terms: 'Standardvillkor',
        status: 'active',
      };
      upsertById<Contract>('contracts', contract);

      return { user: stripPassword(newUser), tempPassword };
    },
    async setPassword(userId, password) {
      await delay(MOCK_LATENCY_MS);
      const existing = byId<User>('users', userId);
      if (!existing) throw new Error(`user_not_found:${userId}`);
      const updated: User = { ...existing, password, status: 'active' };
      upsertById<User>('users', updated);
      return stripPassword(updated);
    },
  };
}
