import type { Role, UserStatus } from '@/types';

/** The landing route for an authenticated user. Pending residents go to onboarding. */
export function homePathFor(role: Role, status: UserStatus = 'active'): string {
  if (role === 'resident' && status === 'pending') return '/onboarding';
  return role === 'resident' ? '/home' : '/admin';
}
