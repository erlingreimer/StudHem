import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SafeUser } from '@/types';
import { api } from '@/services';
import { STORAGE_PREFIX } from '@/config/constants';

const SESSION_KEY = `${STORAGE_PREFIX}session`;

interface AuthContextValue {
  user: SafeUser | null;
  login: (username: string, password: string) => Promise<SafeUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function restore(): SafeUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SafeUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(restore);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      async login(username, password) {
        const u = await api.auth.login(username, password);
        localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
        return u;
      },
      logout() {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
