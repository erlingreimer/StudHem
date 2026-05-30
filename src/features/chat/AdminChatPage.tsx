import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import { useAuth } from '@/auth/AuthContext';
import { useConversations } from '@/services/hooks/chat';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';

export function AdminChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const conversations = useConversations(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && (conversations.data?.length ?? 0) > 0) {
      setSelectedId(conversations.data![0].id);
    }
  }, [conversations.data, selectedId]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('chat.title')}</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined">
            <ConversationList
              conversations={conversations.data ?? []}
              selectedId={selectedId}
              currentUserId={user?.id ?? ''}
              onSelect={setSelectedId}
              loading={conversations.isLoading}
            />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ height: '70vh' }}>
            {selectedId
              ? <MessageThread conversationId={selectedId} />
              : <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary">{t('chat.noConversation')}</Typography>
                </Box>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
