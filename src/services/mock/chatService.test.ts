import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@/services';
import { seedDatabase } from '@/services/mock/seed';

describe('chat service', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
  });

  it('listConversations returns conversations the user participates in', async () => {
    const adminList = await api.chat.listConversations('u-admin');
    expect(adminList.length).toBeGreaterThanOrEqual(2);

    const residentList = await api.chat.listConversations('u-res1');
    expect(residentList).toHaveLength(1);
    expect(residentList[0].id).toBe('conv-1');
  });

  it('listMessages returns the seeded thread ordered by sentAt ascending', async () => {
    const msgs = await api.chat.listMessages('conv-1');
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs[0].sentAt <= msgs[msgs.length - 1].sentAt).toBe(true);
  });

  it('sendMessage appends a new message and stamps sentAt', async () => {
    const before = (await api.chat.listMessages('conv-1')).length;
    const created = await api.chat.sendMessage({
      conversationId: 'conv-1', senderId: 'u-res1', text: 'Tack!',
    });
    expect(created.id).toMatch(/^msg-/);
    expect(created.sentAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect((await api.chat.listMessages('conv-1')).length).toBe(before + 1);
  });
});
