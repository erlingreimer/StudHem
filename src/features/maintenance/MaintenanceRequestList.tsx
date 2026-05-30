import { useTranslation } from 'react-i18next';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { MaintenanceRequest } from '@/types';
import { StatusChip } from '@/components/StatusChip';

interface Props {
  rows: MaintenanceRequest[];
  emptyLabel: string;
  onSelect?: (row: MaintenanceRequest) => void;
}

export function MaintenanceRequestList({ rows, emptyLabel, onSelect }: Props) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <Typography color="text.secondary">{emptyLabel}</Typography>;
  }
  return (
    <Stack sx={{ gap: 1 }}>
      {rows.map((row) => {
        const body = (
          <CardContent>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography variant="overline" color="text.secondary">
                {t(`maintenance.category_labels.${row.category}`)}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <StatusChip kind="maintenance" value={row.status} />
            </Stack>
            <Typography sx={{ mt: 0.5 }}>{row.description}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('maintenance.createdAt')}: {row.createdAt.slice(0, 10)}
            </Typography>
          </CardContent>
        );
        return (
          <Card key={row.id}>
            {onSelect
              ? <CardActionArea onClick={() => onSelect(row)}>{body}</CardActionArea>
              : body}
          </Card>
        );
      })}
    </Stack>
  );
}
