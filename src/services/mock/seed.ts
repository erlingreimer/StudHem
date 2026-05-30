import { hasKey, writeCollection } from './storage';
import {
  buildingFixtures, contractFixtures, conversationFixtures, facilityFixtures,
  maintenanceFixtures, messageFixtures, propertyFixtures, userFixtures,
} from './fixtures';

/** Seeds each collection only if it has never been written. Safe to call on every boot. */
export function seedDatabase(): void {
  if (!hasKey('users')) writeCollection('users', userFixtures);
  if (!hasKey('buildings')) writeCollection('buildings', buildingFixtures);
  if (!hasKey('properties')) writeCollection('properties', propertyFixtures);
  if (!hasKey('contracts')) writeCollection('contracts', contractFixtures);
  if (!hasKey('facilities')) writeCollection('facilities', facilityFixtures);
  if (!hasKey('maintenance')) writeCollection('maintenance', maintenanceFixtures);
  if (!hasKey('conversations')) writeCollection('conversations', conversationFixtures);
  if (!hasKey('messages')) writeCollection('messages', messageFixtures);
}
