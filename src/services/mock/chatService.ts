import type { ChatApi, SendMessageInput } from '@/services/api';
import type { Conversation, Message } from '@/types';
import { MOCK_LATENCY_MS } from '@/config/constants';
import { readCollection, upsertById } from './storage';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateId(): string {
  return `msg-${Math.random().toString(36).slice(2, 10)}`;
}

export function createChatService(): ChatApi {
  return {
    async listConversations(userId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Conversation>('conversations', [])
        .filter((c) => c.participantIds.includes(userId));
    },
    async listMessages(conversationId) {
      await delay(MOCK_LATENCY_MS);
      return readCollection<Message>('messages', [])
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    },
    async sendMessage(input: SendMessageInput) {
      await delay(MOCK_LATENCY_MS);
      const row: Message = {
        id: generateId(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        text: input.text,
        sentAt: new Date().toISOString(),
      };
      upsertById<Message>('messages', row);
      return row;
    },
  };
}
