import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import { NOTICE_PERIOD_MONTHS } from '@/config/constants';
import { useAuth } from '@/auth/AuthContext';
import { useContractByResident, useGiveNotice } from '@/services/hooks/contracts';
import { useProperty } from '@/services/hooks/properties';

export function ResidentHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const contract = useContractByResident(user?.id);
  const property = useProperty(contract.data?.propertyId);
  const giveNotice = useGiveNotice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState(
    dayjs().add(NOTICE_PERIOD_MONTHS, 'month').add(7, 'day').format('YYYY-MM-DD'),
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const noticed = contract.data?.status === 'notice_given';

  async function submit() {
    setErrorMsg(null);
    if (!contract.data) return;
    try {
      await giveNotice.mutateAsync({
        contractId: contract.data.id,
        moveOutDate,
      });
      setDialogOpen(false);
    } catch (e) {
      if ((e as Error).message === 'notice_too_short') {
        setErrorMsg(t('moveOut.tooShort'));
      } else {
        setErrorMsg((e as Error).message);
      }
    }
  }

  if (contract.isLoading || property.isLoading) {
    return <Skeleton variant="rectangular" height={300} />;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('moveOut.title')}</Typography>
      <Stack sx={{ gap: 2 }}>
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {property.data?.name ?? '—'}
              </Typography>
              {noticed && contract.data?.endDate && (
                <Chip
                  color="warning"
                  size="small"
                  label={`${t('moveOut.vacating')} ${contract.data.endDate}`}
                />
              )}
            </Stack>
            <Typography>{t('moveOut.address')}: {property.data?.address}</Typography>
            <Typography>{t('moveOut.rent')}: {property.data?.rent} kr</Typography>
            {contract.data && (
              <Typography>{t('moveOut.startDate')}: {contract.data.startDate}</Typography>
            )}
          </CardContent>
        </Card>

        <Stack direction="row" sx={{ gap: 2 }}>
          {contract.data && !noticed && (
            <Button variant="outlined" color="error" onClick={() => setDialogOpen(true)}>
              {t('moveOut.giveNotice')}
            </Button>
          )}
          {noticed && (
            <Alert severity="info">{t('moveOut.alreadyNoticed')}</Alert>
          )}
        </Stack>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('moveOut.noticeTitle')}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('moveOut.noticePeriodHint')}
            </Typography>
            <TextField
              type="date"
              label={t('moveOut.moveOutDate')}
              value={moveOutDate}
              onChange={(e) => setMoveOutDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            {errorMsg && <Alert severity="warning">{errorMsg}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('moveOut.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={submit}
            disabled={giveNotice.isPending}
          >
            {t('moveOut.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
