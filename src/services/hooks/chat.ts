import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SendMessageInput } from '@/services/api';
import { api } from '@/services';
import { keys } from './queryKeys';

export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? keys.conversations(userId) : ['conversations', 'none'],
    queryFn: () => api.chat.listConversations(userId as string),
    enabled: Boolean(userId),
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationId ? keys.messages(conversationId) : ['messages', 'none'],
    queryFn: () => api.chat.listMessages(conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) => api.chat.sendMessage(input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.messages(row.conversationId) });
    },
  });
}
