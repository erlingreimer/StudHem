import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InviteInput } from '@/services/api';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useUsers() {
  return useQuery({ queryKey: keys.users(), queryFn: () => api.users.list() });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.user(id) : ['users', 'none'],
    queryFn: async () => (await api.users.get(id as string)) ?? null,
    enabled: Boolean(id),
  });
}

export function useInviteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteInput) => api.users.invite(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.users() });
      qc.invalidateQueries({ queryKey: keys.properties() });
    },
  });
}

export function useSetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      api.users.setPassword(userId, password),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: keys.users() });
      qc.invalidateQueries({ queryKey: keys.user(u.id) });
    },
  });
}
