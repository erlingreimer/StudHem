import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import type { Contract } from '@/types';
import { useProperties } from '@/services/hooks/properties';
import { useMaintenanceRequests } from '@/services/hooks/maintenance';
import { useInvoices } from '@/services/hooks/economy';
import { readCollection } from '@/services/mock/storage';

interface CardSpec {
  label: string;
  value: string | number;
  to?: string;
}

function StatCard({ spec, loading }: { spec: CardSpec; loading: boolean }) {
  const body = (
    <CardContent>
      <Typography variant="overline" color="text.secondary">{spec.label}</Typography>
      <Typography variant="h3" sx={{ mt: 1 }}>
        {loading ? <Skeleton width={80} /> : spec.value}
      </Typography>
    </CardContent>
  );
  return (
    <Card>
      {spec.to ? <CardActionArea component={RouterLink} to={spec.to}>{body}</CardActionArea> : body}
    </Card>
  );
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const properties = useProperties();
  const maintenance = useMaintenanceRequests();
  const invoices = useInvoices();
  const total = properties.data?.length ?? 0;
  const occupied = properties.data?.filter((p) => p.status === 'occupied').length ?? 0;
  const occupancyPct = total === 0 ? 0 : Math.round((occupied / total) * 100);
  const vacancies = total - occupied;
  const openMaintenance =
    maintenance.data?.filter((r) => r.status !== 'resolved').length ?? 0;
  const unpaid =
    invoices.data?.filter((r) => r.status !== 'paid').length ?? 0;
  // Reading contracts directly avoids a dedicated hook for one count card.
  // It re-reads on each render, which is fine for a small synchronous load
  // and stays in sync after mutations re-render the page via invalidations.
  const upcomingMoveOuts = readCollection<Contract>('contracts', [])
    .filter((c) => c.status === 'notice_given').length;

  const cards: CardSpec[] = [
    { label: t('dashboard.properties'), value: total, to: '/admin/properties' },
    { label: t('dashboard.occupancy'), value: `${occupancyPct}%`, to: '/admin/properties' },
    { label: t('dashboard.vacancies'), value: vacancies, to: '/admin/properties' },
    { label: t('dashboard.openMaintenance'), value: openMaintenance, to: '/admin/maintenance' },
    { label: t('dashboard.unpaidRent'), value: unpaid, to: '/admin/economy' },
    { label: t('dashboard.upcomingMoveOuts'), value: upcomingMoveOuts, to: '/admin/properties' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>{t('dashboard.title')}</Typography>
      <Grid container spacing={2}>
        {cards.map((spec) => (
          <Grid key={spec.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard spec={spec} loading={properties.isLoading} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
