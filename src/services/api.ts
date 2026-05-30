import type { SafeUser } from '@/types';

export interface AuthApi {
  login(username: string, password: string): Promise<SafeUser>;
}

/** The backend contract. Mock impl today; a REST impl can replace it later. */
export interface Api {
  auth: AuthApi;
}
