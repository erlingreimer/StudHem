import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import { readCollection } from '@/services/mock/storage';
import type { Property } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { useMaintenanceByResident } from '@/services/hooks/maintenance';
import { MaintenanceRequestList } from './MaintenanceRequestList';
import { NewRequestDialog } from './NewRequestDialog';

export function ResidentMaintenancePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const requests = useMaintenanceByResident(user?.id);
  const [creating, setCreating] = useState(false);

  const myProperty = useMemo(() => {
    if (!user) return undefined;
    return readCollection<Property>('properties', []).find((p) => p.residentId === user.id);
  }, [user]);

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('maintenance.myTitle')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!myProperty}
          onClick={() => setCreating(true)}
        >
          {t('maintenance.new')}
        </Button>
      </Stack>
      {requests.isLoading
        ? <Skeleton variant="rectangular" height={200} />
        : <MaintenanceRequestList rows={requests.data ?? []} emptyLabel={t('maintenance.empty')} />}

      {myProperty && (
        <NewRequestDialog
          open={creating}
          onClose={() => setCreating(false)}
          propertyId={myProperty.id}
        />
      )}
    </Box>
  );
}
