import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(error.status)) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  subjects: ['subjects'] as const,
  subject: (slug: string) => ['subject', slug] as const,
  exams: (filters: Record<string, string | number | undefined>) => ['exams', filters] as const,
  revisionQueue: (subject?: string) => ['revision', subject ?? 'all'] as const,
  analytics: ['analytics'] as const,
  plan: ['plan'] as const,
};
