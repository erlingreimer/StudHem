import { useState } from 'react';
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
import { homePathFor } from '@/auth/paths';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setError(false);
    try {
      const user = await login(username, password);
      navigate(homePathFor(user.role), { replace: true });
    } catch {
      setError(true);
    }
  });

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 3 }}>{t('login.title')}</Typography>
          <form onSubmit={onSubmit} noValidate>
            <Stack sx={{ gap: 2 }}>
              {error && <Alert severity="error">{t('login.error')}</Alert>}
              <TextField
                label={t('login.username')}
                autoComplete="username"
                {...register('username')}
              />
              <TextField
                label={t('login.password')}
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
                {t('login.submit')}
              </Button>
            </Stack>
          </form>
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              {t('login.demoHeading')}: admin / admin123 · resident / resident123
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
