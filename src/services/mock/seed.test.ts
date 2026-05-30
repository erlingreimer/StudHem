import { describe, it, expect, beforeEach } from 'vitest';
import { seedDatabase } from '@/services/mock/seed';
import { readCollection } from '@/services/mock/storage';
import type {
  Building, Contract, Conversation, Facility, Invoice, MaintenanceRequest,
  Message, Property, User,
} from '@/types';

describe('seedDatabase', () => {
  beforeEach(() => localStorage.clear());

  it('seeds users (incl. one pending resident)', () => {
    seedDatabase();
    const users = readCollection<User>('users', []);
    expect(users.map((u) => u.username).sort()).toEqual(
      ['admin', 'pending', 'resident', 'resident2', 'staff'],
    );
    expect(users.find((u) => u.username === 'pending')?.status).toBe('pending');
  });

  it('seeds buildings, properties, contracts and facilities', () => {
    seedDatabase();
    expect(readCollection<Building>('buildings', [])).toHaveLength(2);
    const properties = readCollection<Property>('properties', []);
    expect(properties.length).toBeGreaterThanOrEqual(8);
    expect(properties.every((p) => p.buildingId)).toBe(true);
    expect(readCollection<Contract>('contracts', []).length).toBeGreaterThan(0);
    expect(readCollection<Facility>('facilities', []).length).toBeGreaterThanOrEqual(8);
  });

  it('seeds at least three maintenance requests covering each status', () => {
    seedDatabase();
    const rows = readCollection<MaintenanceRequest>('maintenance', []);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const statuses = new Set(rows.map((r) => r.status));
    expect(statuses.has('received')).toBe(true);
    expect(statuses.has('in_progress')).toBe(true);
    expect(statuses.has('resolved')).toBe(true);
  });

  it('seeds one conversation per active resident with at least one message', () => {
    seedDatabase();
    const conversations = readCollection<Conversation>('conversations', []);
    const messages = readCollection<Message>('messages', []);
    expect(conversations.length).toBeGreaterThanOrEqual(2);
    for (const c of conversations) {
      expect(messages.some((m) => m.conversationId === c.id)).toBe(true);
    }
    for (const c of conversations) {
      expect(c.participantIds).toEqual(expect.arrayContaining(['u-admin']));
    }
  });

  it('seeds invoices covering paid and unpaid', () => {
    seedDatabase();
    const rows = readCollection<Invoice>('invoices', []);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.status === 'paid')).toBe(true);
    expect(rows.some((r) => r.status === 'unpaid')).toBe(true);
  });

  it('is idempotent across all collections', () => {
    seedDatabase();
    const first = readCollection<Property>('properties', []);
    first[0].name = 'EDITED';
    localStorage.setItem('studhem.v1.properties', JSON.stringify(first));
    seedDatabase();
    const after = readCollection<Property>('properties', []);
    expect(after.find((p) => p.id === first[0].id)?.name).toBe('EDITED');
  });
});
