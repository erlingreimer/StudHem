import Chip, { type ChipProps } from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import type {
  InvoiceStatus, MaintenanceStatus, PropertyStatus,
} from '@/types';

type Kind = 'property' | 'maintenance' | 'invoice';

type ValueFor<K extends Kind> =
  K extends 'property' ? PropertyStatus :
  K extends 'maintenance' ? MaintenanceStatus :
  InvoiceStatus;

type StatusChipProps<K extends Kind> = {
  kind: K;
  value: ValueFor<K>;
  size?: ChipProps['size'];
};

const colors: Record<Kind, Record<string, ChipProps['color']>> = {
  property: { vacant: 'default', occupied: 'success' },
  maintenance: { received: 'info', in_progress: 'warning', resolved: 'success' },
  invoice: { paid: 'success', unpaid: 'warning', overdue: 'error' },
};

export function StatusChip<K extends Kind>({ kind, value, size = 'small' }: StatusChipProps<K>) {
  const { t } = useTranslation();
  return (
    <Chip
      size={size}
      color={colors[kind][value] ?? 'default'}
      label={t(`status.${kind}.${value}`)}
    />
  );
}
