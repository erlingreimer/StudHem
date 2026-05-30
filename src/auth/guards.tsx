import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/types';
import { useAuth } from './AuthContext';
import { homePathFor } from './paths';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'resident' && user.status === 'pending') {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'resident' && user.status === 'pending') {
    return <Navigate to="/onboarding" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role, user.status)} replace />;
  }
  return <>{children}</>;
}

/** Only pending residents may stay; everyone else gets sent to their home. */
export function RequirePending({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'resident' || user.status !== 'pending') {
    return <Navigate to={homePathFor(user.role, user.status)} replace />;
  }
  return <>{children}</>;
}

/** Sends "/" and unknown routes to the right place based on auth state. */
export function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user.role, user.status) : '/login'} replace />;
}
