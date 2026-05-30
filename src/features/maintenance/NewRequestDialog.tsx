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
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import type { MaintenanceCategory } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { useCreateMaintenanceRequest } from '@/services/hooks/maintenance';
import { downscaleToBase64Jpeg } from './photoDownscale';

const MAX_PHOTOS = 3;

const categories: MaintenanceCategory[] = [
  'appliance', 'plumbing', 'electrical', 'heating', 'door_lock', 'internet', 'other',
];

const schema = z.object({
  category: z.enum(categories as [MaintenanceCategory, ...MaintenanceCategory[]]),
  description: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
}

export function NewRequestDialog({ open, onClose, propertyId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const create = useCreateMaintenanceRequest();
  const [photos, setPhotos] = useState<string[]>([]);
  const [tooMany, setTooMany] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { category: 'other', description: '' },
    });

  async function handleFiles(files: FileList | null) {
    setTooMany(false);
    setSaveError(false);
    if (!files) return;
    const incoming = Array.from(files);
    if (photos.length + incoming.length > MAX_PHOTOS) {
      setTooMany(true);
      return;
    }
    const next = [...photos];
    for (const f of incoming) {
      try {
        next.push(await downscaleToBase64Jpeg(f));
      } catch {
        setSaveError(true);
      }
    }
    setPhotos(next);
  }

  function close() {
    reset();
    setPhotos([]);
    setTooMany(false);
    setSaveError(false);
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    if (!user) return;
    try {
      await create.mutateAsync({
        propertyId,
        residentId: user.id,
        category: values.category,
        description: values.description,
        photoUrls: photos,
      });
      close();
    } catch {
      setSaveError(true);
    }
  });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{t('maintenance.new')}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {tooMany && <Alert severity="warning">{t('maintenance.photoTooManyError')}</Alert>}
            {saveError && <Alert severity="error">{t('maintenance.photoSaveError')}</Alert>}
            <TextField
              select
              label={t('maintenance.category')}
              defaultValue="other"
              {...register('category')}
            >
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {t(`maintenance.category_labels.${c}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('maintenance.description')}
              multiline
              minRows={3}
              error={Boolean(errors.description)}
              helperText={errors.description && t('maintenance.required')}
              {...register('description')}
            />
            <Button variant="outlined" component="label">
              {t('maintenance.addPhotos')}
              <input
                data-testid="photo-input"
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
              />
            </Button>
            {photos.length > 0 && (
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                {photos.map((src, i) => (
                  <Box key={`${i}-${src.length}`} sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={src}
                      alt=""
                      sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                    />
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 0, right: 0 }}
                      onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="remove"
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t('maintenance.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t('maintenance.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
