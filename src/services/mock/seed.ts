import { hasKey, writeCollection } from './storage';
import { userFixtures } from './fixtures';

/** Seeds each collection only if it has never been written. Safe to call on every boot. */
export function seedDatabase(): void {
  if (!hasKey('users')) writeCollection('users', userFixtures);
  // later milestones: properties, buildings, facilities, contracts, invoices, etc.
}
