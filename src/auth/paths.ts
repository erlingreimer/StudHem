import type { Role } from '@/types';

/** The landing route for a given role. */
export function homePathFor(role: Role): string {
  return role === 'resident' ? '/home' : '/admin';
}
