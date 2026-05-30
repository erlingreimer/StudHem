import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('properties service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('list returns all seeded properties', async () => {
    const rows = await api.properties.list();
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it('get returns a single property by id', async () => {
    const row = await api.properties.get('p-101');
    expect(row?.id).toBe('p-101');
  });

  it('create assigns an id and appends the property', async () => {
    const before = (await api.properties.list()).length;
    const created = await api.properties.create({
      name: 'Rum 999', address: 'Test', roomType: 'corridor room',
      rent: 4000, status: 'vacant', buildingId: 'b-norra',
    });
    expect(created.id).toMatch(/^p-/);
    expect((await api.properties.list()).length).toBe(before + 1);
  });

  it('update merges fields onto the existing row', async () => {
    const updated = await api.properties.update('p-101', { rent: 5000 });
    expect(updated.rent).toBe(5000);
    expect((await api.properties.get('p-101'))?.rent).toBe(5000);
  });

  it('remove drops the property', async () => {
    await api.properties.remove('p-103');
    expect(await api.properties.get('p-103')).toBeUndefined();
  });
});
