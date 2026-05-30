import type { AuthApi } from '@/services/api';
import type { User } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { readCollection } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class AuthError extends Error {}

export function createAuthService(): AuthApi {
  return {
    async login(username, password) {
      await delay(MOCK_LATENCY_MS);
      const users = readCollection<User>('users', []);
      const match = users.find((u) => u.username === username);
      if (!match || match.password !== password) {
        throw new AuthError('invalid_credentials');
      }
      const { password: _omit, ...safe } = match;
      return safe;
    },
  };
}
