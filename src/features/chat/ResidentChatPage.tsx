import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useAuth } from '@/auth/AuthContext';
import { useConversations } from '@/services/hooks/chat';
import { MessageThread } from './MessageThread';

export function ResidentChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const conversations = useConversations(user?.id);
  const conversation = conversations.data?.[0];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('chat.title')}</Typography>
      <Paper variant="outlined" sx={{ height: '70vh' }}>
        {conversations.isLoading
          ? <Skeleton variant="rectangular" height={300} />
          : conversation
            ? <MessageThread conversationId={conversation.id} />
            : <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">{t('chat.noConversation')}</Typography>
              </Box>}
      </Paper>
    </Box>
  );
}
