import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { Conversation } from '@/types';
import { useUsers } from '@/services/hooks/users';
import { useProperties } from '@/services/hooks/properties';

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function ConversationList({
  conversations, selectedId, currentUserId, onSelect, loading,
}: Props) {
  const { t } = useTranslation();
  const users = useUsers();
  const properties = useProperties();

  const userById = useMemo(
    () => new Map(users.data?.map((u) => [u.id, u]) ?? []),
    [users.data],
  );
  const propertyById = useMemo(
    () => new Map(properties.data?.map((p) => [p.id, p]) ?? []),
    [properties.data],
  );

  if (loading) return <Skeleton variant="rectangular" height={300} />;
  if (conversations.length === 0) {
    return <Typography color="text.secondary">{t('chat.noConversations')}</Typography>;
  }

  return (
    <List dense>
      {conversations.map((c) => {
        const otherIds = c.participantIds.filter((id) => id !== currentUserId);
        const otherNames = otherIds
          .map((id) => userById.get(id)?.name)
          .filter(Boolean)
          .join(', ');
        const property = propertyById.get(c.propertyId);
        return (
          <ListItemButton
            key={c.id}
            selected={c.id === selectedId}
            onClick={() => onSelect(c.id)}
          >
            <ListItemText
              primary={otherNames || c.id}
              secondary={property?.name ?? c.propertyId}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
