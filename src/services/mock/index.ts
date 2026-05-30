import type { Api } from '@/services/api';
import { seedDatabase } from './seed';
import { createAuthService } from './authService';

export function createMockApi(): Api {
  seedDatabase();
  return {
    auth: createAuthService(),
  };
}
