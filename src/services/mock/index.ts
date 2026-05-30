import type { Api } from '@/services/api';
import { seedDatabase } from './seed';
import { createAuthService } from './authService';
import { createPropertiesService } from './propertiesService';
import { createContractsService } from './contractsService';
import { createUsersService } from './usersService';
import { createMaintenanceService } from './maintenanceService';
import { createChatService } from './chatService';

export function createMockApi(): Api {
  seedDatabase();
  return {
    auth: createAuthService(),
    properties: createPropertiesService(),
    contracts: createContractsService(),
    users: createUsersService(),
    maintenance: createMaintenanceService(),
    chat: createChatService(),
  };
}
