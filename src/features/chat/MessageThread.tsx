import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { useAuth } from '@/auth/AuthContext';
import { useMessages, useSendMessage } from '@/services/hooks/chat';

interface Props {
  conversationId: string;
}

export function MessageThread({ conversationId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const messages = useMessages(conversationId);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    await send.mutateAsync({ conversationId, senderId: user.id, text: text.trim() });
    setText('');
  }

  return (
    <Stack sx={{ height: '100%', minHeight: 400 }}>
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, overflowY: 'auto', p: 1, display: 'flex',
          flexDirection: 'column', gap: 1, minHeight: 0,
        }}
      >
        {messages.isLoading && <Skeleton variant="rectangular" height={120} />}
        {!messages.isLoading && (messages.data?.length ?? 0) === 0 && (
          <Typography color="text.secondary">{t('chat.empty')}</Typography>
        )}
        {messages.data?.map((msg) => {
          const mine = msg.senderId === user?.id;
          return (
            <Box
              key={msg.id}
              sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.25, maxWidth: '70%',
                  bgcolor: mine ? 'primary.main' : 'background.paper',
                  color: mine ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2">{msg.text}</Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}
                >
                  {msg.sentAt.replace('T', ' ').slice(0, 16)}
                </Typography>
              </Paper>
            </Box>
          );
        })}
      </Box>
      <Box component="form" onSubmit={submit} sx={{ p: 1, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          label={t('chat.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={!text.trim() || send.isPending}>
          {t('chat.send')}
        </Button>
      </Box>
    </Stack>
  );
}
