import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { StatusChip } from '@/components/StatusChip';
import { useProperty } from '@/services/hooks/properties';
import { useContractByProperty, useMarkMovedOut } from '@/services/hooks/contracts';
import { useUser } from '@/services/hooks/users';
import { useMaintenanceByProperty } from '@/services/hooks/maintenance';
import { MaintenanceRequestList } from '@/features/maintenance/MaintenanceRequestList';
import { PropertyFormDialog } from './PropertyFormDialog';
import { InviteResidentDialog } from './InviteResidentDialog';

export function PropertyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const property = useProperty(id);
  const contract = useContractByProperty(id);
  const resident = useUser(property.data?.residentId);
  const requests = useMaintenanceByProperty(id);

  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const markMovedOut = useMarkMovedOut();
  const noticed = contract.data?.status === 'notice_given';

  if (property.isLoading) return <Skeleton variant="rectangular" height={300} />;
  if (!property.data) {
    return (
      <Stack sx={{ gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/admin/properties">
          {t('propertyDetail.back')}
        </Button>
        <Alert severity="warning">{t('propertyDetail.notFound')}</Alert>
      </Stack>
    );
  }

  const p = property.data;

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/admin/properties">
          {t('propertyDetail.back')}
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{p.name}</Typography>
        <StatusChip kind="property" value={p.status} />
        {noticed && contract.data?.endDate && (
          <Chip
            color="warning"
            size="small"
            label={`${t('moveOut.vacating')} ${contract.data.endDate}`}
          />
        )}
        <Button startIcon={<EditIcon />} onClick={() => setEditing(true)}>
          {t('propertyDetail.edit')}
        </Button>
        {noticed && contract.data && (
          <Button
            variant="outlined"
            color="warning"
            onClick={() => markMovedOut.mutateAsync(contract.data!.id)}
          >
            {t('moveOut.markMovedOut')}
          </Button>
        )}
        {p.status === 'vacant' && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviting(true)}
          >
            {t('propertyDetail.invite')}
          </Button>
        )}
      </Stack>

      <Stack sx={{ gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.info')}</Typography>
            <Typography>{p.address}</Typography>
            <Typography>{p.roomType}</Typography>
            <Typography>{p.rent} kr</Typography>
            {p.description && <Typography sx={{ mt: 1 }}>{p.description}</Typography>}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.resident')}</Typography>
            {resident.data ? (
              <Stack>
                <Typography>{resident.data.name}</Typography>
                <Typography variant="body2" color="text.secondary">{resident.data.email}</Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">{t('propertyDetail.noResident')}</Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.contract')}</Typography>
            {contract.data ? (
              <Stack>
                <Typography>{t('propertyDetail.contractRent')}: {contract.data.rent} kr</Typography>
                <Typography>{t('propertyDetail.contractStart')}: {contract.data.startDate}</Typography>
                <Typography>{t('propertyDetail.contractTerms')}: {contract.data.terms}</Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">{t('propertyDetail.noContract')}</Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('propertyDetail.maintenance')}</Typography>
            {requests.isLoading
              ? <Skeleton variant="rectangular" height={120} />
              : <MaintenanceRequestList
                  rows={requests.data ?? []}
                  emptyLabel={t('maintenance.empty')}
                />}
          </CardContent>
        </Card>
      </Stack>

      <PropertyFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        mode="edit"
        propertyId={p.id}
      />
      <InviteResidentDialog
        open={inviting}
        onClose={() => setInviting(false)}
        propertyId={p.id}
      />
    </Box>
  );
}
