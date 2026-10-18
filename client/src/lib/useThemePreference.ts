import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { MeResponse, ThemePreference } from '@shared/types';
import { api } from './api';
import { useAuth } from './auth';
import { queryKeys } from './query';
import { useTheme } from './theme';
import { useToast } from '@/components/ui/Toast';

/**
 * Applies a theme immediately (pre-paint preference in localStorage) and syncs
 * it to the authenticated account so the choice survives devices and sessions.
 */
export function useThemePreference(onSaved?: () => void) {
  const { setTheme } = useTheme();
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const changeTheme = useCallback(
    async (next: ThemePreference) => {
      setTheme(next);
      if (!me) return;
      setSaving(true);
      queryClient.setQueryData<MeResponse>(queryKeys.me, (current) =>
        current ? { ...current, settings: { ...current.settings, theme: next } } : current,
      );
      try {
        const result = await api<{ settings: MeResponse['settings'] }>('/settings', {
          method: 'PATCH',
          body: { theme: next },
        });
        queryClient.setQueryData<MeResponse>(queryKeys.me, (current) =>
          current ? { ...current, settings: result.settings } : current,
        );
        onSaved?.();
      } catch {
        toast({
          title: 'تم تغيير المظهر على هذا الجهاز',
          description: 'تعذّر حفظ التفضيل في حسابك الآن. سنحاول مجددًا لاحقًا.',
          variant: 'warning',
        });
      } finally {
        setSaving(false);
      }
    },
    [me, onSaved, queryClient, setTheme, toast],
  );

  return { changeTheme, saving };
}
