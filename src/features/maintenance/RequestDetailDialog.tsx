import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import type { MaintenanceStatus } from '@/types';
import {
  useAssignMaintenance, useMaintenanceRequest, useUpdateMaintenanceStatus,
} from '@/services/hooks/maintenance';
import { useUsers } from '@/services/hooks/users';
import { StatusChip } from '@/components/StatusChip';

const STATUSES: MaintenanceStatus[] = ['received', 'in_progress', 'resolved'];
const UNASSIGNED = '__unassigned__';

interface Props {
  requestId: string | null;
  onClose: () => void;
}

export function RequestDetailDialog({ requestId, onClose }: Props) {
  const { t } = useTranslation();
  const open = Boolean(requestId);
  const request = useMaintenanceRequest(requestId ?? undefined);
  const users = useUsers();
  const update = useUpdateMaintenanceStatus();
  const assign = useAssignMaintenance();

  const staff = useMemo(
    () => users.data?.filter((u) => u.role === 'admin' || u.role === 'staff') ?? [],
    [users.data],
  );

  const [nextStatus, setNextStatus] = useState<MaintenanceStatus>('received');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (request.data) setNextStatus(request.data.status);
  }, [request.data]);

  if (!open) return null;
  const row = request.data;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {row ? t(`maintenance.category_labels.${row.category}`) : '...'}
      </DialogTitle>
      <DialogContent>
        {row && (
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <StatusChip kind="maintenance" value={row.status} />
              <Box sx={{ flexGrow: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {t('maintenance.createdAt')}: {row.createdAt.slice(0, 10)}
              </Typography>
            </Stack>
            <Typography>{row.description}</Typography>

            {row.photoUrls.length > 0 && (
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                {row.photoUrls.map((src, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={src}
                    alt=""
                    sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }}
                  />
                ))}
              </Stack>
            )}

            <TextField
              select
              label={t('maintenance.assignTo')}
              value={row.assignedTo ?? UNASSIGNED}
              onChange={(e) => {
                const v = e.target.value;
                void assign.mutateAsync({
                  id: row.id,
                  staffUserId: v === UNASSIGNED ? undefined : v,
                });
              }}
            >
              <MenuItem value={UNASSIGNED}>{t('maintenance.unassigned')}</MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>

            <Stack direction="row" sx={{ gap: 2, alignItems: 'flex-start' }}>
              <TextField
                select
                label={t('maintenance.changeStatus')}
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as MaintenanceStatus)}
                sx={{ width: 200 }}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {t(`status.maintenance.${s}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('maintenance.addNote')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                disabled={nextStatus === row.status && note.trim() === ''}
                onClick={async () => {
                  await update.mutateAsync({
                    id: row.id, status: nextStatus, note: note || undefined,
                  });
                  setNote('');
                }}
              >
                {t('maintenance.save')}
              </Button>
            </Stack>

            <Typography variant="h6">{t('maintenance.history')}</Typography>
            <List dense>
              {row.history.map((entry, i) => (
                <ListItem key={i}>
                  <ListItemText
                    primary={`${t(`status.maintenance.${entry.status}`)} — ${entry.at.slice(0, 10)}`}
                    secondary={entry.note}
                  />
                </ListItem>
              ))}
            </List>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('maintenance.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
}
