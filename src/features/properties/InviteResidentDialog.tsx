import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useInviteResident } from '@/services/hooks/users';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
}

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
type FormValues = z.infer<typeof schema>;

interface RevealedInvite {
  tempPassword: string;
  username: string;
}

export function InviteResidentDialog({ open, onClose, propertyId }: Props) {
  const { t } = useTranslation();
  const invite = useInviteResident();
  const [revealed, setRevealed] = useState<RevealedInvite | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { name: '', email: '' },
    });

  function handleClose() {
    setRevealed(null);
    reset();
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    const result = await invite.mutateAsync({ ...values, propertyId });
    setRevealed({ tempPassword: result.tempPassword, username: result.user.username });
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {revealed ? t('invite.successTitle') : t('invite.title')}
      </DialogTitle>
      {revealed ? (
        <>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              <Alert severity="info">{t('invite.tempPasswordHint')}</Alert>
              <Typography>
                {t('invite.username')}: <code>{revealed.username}</code>
              </Typography>
              <Typography>
                <code>{revealed.tempPassword}</code>
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleClose}>{t('invite.done')}</Button>
          </DialogActions>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              <TextField
                label={t('invite.name')}
                error={Boolean(errors.name)}
                helperText={errors.name && t('invite.required')}
                {...register('name')}
              />
              <TextField
                label={t('invite.email')}
                type="email"
                error={Boolean(errors.email)}
                helperText={errors.email && t('invite.required')}
                {...register('email')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>{t('invite.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {t('invite.send')}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}
