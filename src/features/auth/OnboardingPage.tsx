import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/auth/AuthContext';
import { useSetUserPassword } from '@/services/hooks/users';
import { homePathFor } from '@/auth/paths';

const schema = z
  .object({
    password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' });

type FormValues = z.infer<typeof schema>;

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const setPassword = useSetUserPassword();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { password: '', confirm: '' },
    });

  const submit = handleSubmit(async ({ password }) => {
    if (!user) return;
    await setPassword.mutateAsync({ userId: user.id, password });
    await refreshUser();
    navigate(homePathFor('resident', 'active'), { replace: true });
  });

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 3 }}>{t('onboarding.title')}</Typography>
          <form onSubmit={submit} noValidate>
            <Stack sx={{ gap: 2 }}>
              <TextField
                label={t('onboarding.password')}
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.password)}
                helperText={errors.password && t('onboarding.tooShort')}
                {...register('password')}
              />
              <TextField
                label={t('onboarding.confirm')}
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.confirm)}
                helperText={errors.confirm && (errors.confirm.message === 'mismatch'
                  ? t('onboarding.mismatch')
                  : t('onboarding.tooShort'))}
                {...register('confirm')}
              />
              {errors.confirm?.message === 'mismatch' && (
                <Alert severity="error">{t('onboarding.mismatch')}</Alert>
              )}
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {t('onboarding.submit')}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
