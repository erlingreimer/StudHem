import { describe, it, expect } from 'vitest';
import type { User, Property, Booking, Contract } from '@/types';

describe('domain types', () => {
  it('compiles representative entities with v1 extensions', () => {
    const user: User = {
      id: 'u1', name: 'Test', email: 't@e.se', username: 'test',
      role: 'resident', password: 'x', status: 'active',
    };
    const property: Property = {
      id: 'p1', name: 'Rum 1', address: 'Gata 1', roomType: 'corridor room',
      rent: 4500, status: 'vacant', buildingId: 'b1',
    };
    const contract: Contract = {
      id: 'c1', propertyId: 'p1', residentId: 'u1', startDate: '2026-01-01',
      rent: 4500, terms: '...', status: 'active',
    };
    const booking: Booking = {
      id: 'bk1', facilityType: 'laundry', facilityId: 'f1',
      bookedById: 'u1', start: '2026-06-01T07:00:00Z', end: '2026-06-01T10:00:00Z',
    };
    expect([user.status, property.buildingId, contract.status, booking.facilityId])
      .toEqual(['active', 'b1', 'active', 'f1']);
  });
});
