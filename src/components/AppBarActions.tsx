import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';
import { useColorMode } from '@/theme/ColorModeContext';
import { useAuth } from '@/auth/AuthContext';

export function AppBarActions() {
  const { mode, toggle } = useColorMode();
  const { i18n, t } = useTranslation();
  const { logout } = useAuth();

  return (
    <>
      <Tooltip title={t('common.theme')}>
        <IconButton color="inherit" onClick={toggle} aria-label={t('common.theme')}>
          {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Tooltip>
      <Tooltip title={t('common.language')}>
        <IconButton
          color="inherit"
          onClick={() => i18n.changeLanguage(i18n.language === 'sv' ? 'en' : 'sv')}
          aria-label={t('common.language')}
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('common.logout')}>
        <IconButton color="inherit" onClick={logout} aria-label={t('common.logout')}>
          <LogoutIcon />
        </IconButton>
      </Tooltip>
    </>
  );
}
