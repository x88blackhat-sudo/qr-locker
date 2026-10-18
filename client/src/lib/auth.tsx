import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeResponse, SubscriptionInfo } from '@shared/types';
import { api, isUnauthorized } from './api';
import { queryKeys } from './query';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

interface AuthContextValue {
  me: MeResponse | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  login: (email: string, password: string) => Promise<MeResponse>;
  register: (input: RegisterInput) => Promise<MeResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<MeResponse>('/auth/me'),
    staleTime: 45_000,
    retry: (count, error) => {
      if (isUnauthorized(error)) return false;
      return count < 1;
    },
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await api<MeResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      queryClient.setQueryData(queryKeys.me, me);
      return me;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const me = await api<MeResponse>('/auth/register', {
        method: 'POST',
        body: input,
      });
      queryClient.setQueryData(queryKeys.me, me);
      return me;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      queryClient.setQueryData(queryKeys.me, null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      me: query.data ?? null,
      isLoading: query.isLoading,
      error: query.error,
      refetch: query.refetch,
      login,
      register,
      logout,
    }),
    [query.data, query.isLoading, query.error, query.refetch, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useStudyAccess(): { subscription: SubscriptionInfo | null; canStudy: boolean } {
  const { me } = useAuth();
  const subscription = me?.subscription ?? null;
  return {
    subscription,
    canStudy: subscription?.access === 'trial' || subscription?.access === 'paid',
  };
}
