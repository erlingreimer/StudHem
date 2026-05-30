import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import ChatIcon from '@mui/icons-material/Chat';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { AppBarActions } from './AppBarActions';

export function ResidentLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const value = pathname.startsWith('/maintenance')
    ? '/maintenance'
    : pathname.startsWith('/chat')
      ? '/chat'
      : pathname.startsWith('/rent')
        ? '/rent'
        : '/home';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', pb: 8 }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{t('app.name')}</Typography>
          <AppBarActions />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
        <Toolbar />
        <Outlet />
      </Box>
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={value}
          onChange={(_, next) => navigate(next)}
        >
          <BottomNavigationAction value="/home" label={t('nav.home')} icon={<HomeIcon />} />
          <BottomNavigationAction
            value="/maintenance"
            label={t('nav.maintenance')}
            icon={<BuildIcon />}
          />
          <BottomNavigationAction
            value="/chat"
            label={t('nav.chat')}
            icon={<ChatIcon />}
          />
          <BottomNavigationAction
            value="/rent"
            label={t('nav.rent')}
            icon={<AttachMoneyIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
