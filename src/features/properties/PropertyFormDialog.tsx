import { useEffect, useMemo } from 'react';
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
import type { Property } from '@/types';
import { useCreateProperty, useProperty, useUpdateProperty } from '@/services/hooks/properties';
import { readCollection } from '@/services/mock/storage';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  propertyId?: string;
}

const schema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  roomType: z.string().min(1),
  rent: z.coerce.number().int().nonnegative(),
  buildingId: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['vacant', 'occupied']),
});
type FormValues = z.infer<typeof schema>;

export function PropertyFormDialog({ open, onClose, mode, propertyId }: Props) {
  const { t } = useTranslation();
  const create = useCreateProperty();
  const update = useUpdateProperty();
  const existing = useProperty(mode === 'edit' ? propertyId : undefined);

  const buildings = useMemo(
    () => readCollection<{ id: string; name: string }>('buildings', []),
    [],
  );

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: '', address: '', roomType: '', rent: 0,
        buildingId: buildings[0]?.id ?? '',
        description: '', status: 'vacant',
      },
    });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && existing.data) {
      reset({
        name: existing.data.name,
        address: existing.data.address,
        roomType: existing.data.roomType,
        rent: existing.data.rent,
        buildingId: existing.data.buildingId,
        description: existing.data.description ?? '',
        status: existing.data.status,
      });
    }
    if (mode === 'create') {
      reset({
        name: '', address: '', roomType: '', rent: 0,
        buildingId: buildings[0]?.id ?? '',
        description: '', status: 'vacant',
      });
    }
  }, [open, mode, existing.data, reset, buildings]);

  const submit = handleSubmit(async (values) => {
    const payload: Omit<Property, 'id'> = {
      name: values.name,
      address: values.address,
      roomType: values.roomType,
      rent: values.rent,
      buildingId: values.buildingId,
      description: values.description || undefined,
      status: values.status,
    };
    if (mode === 'create') {
      await create.mutateAsync(payload);
    } else if (propertyId) {
      await update.mutateAsync({ id: propertyId, patch: payload });
    }
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === 'create' ? t('properties.form.createTitle') : t('properties.form.editTitle')}
      </DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <TextField
              label={t('properties.form.name')}
              error={Boolean(errors.name)}
              helperText={errors.name && t('properties.form.required')}
              {...register('name')}
            />
            <TextField
              label={t('properties.form.address')}
              error={Boolean(errors.address)}
              helperText={errors.address && t('properties.form.required')}
              {...register('address')}
            />
            <TextField
              label={t('properties.form.roomType')}
              error={Boolean(errors.roomType)}
              helperText={errors.roomType && t('properties.form.required')}
              {...register('roomType')}
            />
            <TextField
              label={t('properties.form.rent')}
              type="number"
              inputProps={{ min: 0 }}
              error={Boolean(errors.rent)}
              helperText={errors.rent && t('properties.form.required')}
              {...register('rent')}
            />
            <TextField
              select
              label={t('properties.form.building')}
              defaultValue={buildings[0]?.id ?? ''}
              {...register('buildingId')}
            >
              {buildings.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('properties.form.description')}
              multiline
              minRows={2}
              {...register('description')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('properties.form.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t('properties.form.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
