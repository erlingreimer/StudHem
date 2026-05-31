import { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BuildIcon from '@mui/icons-material/Build';
import ChatIcon from '@mui/icons-material/Chat';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { AppBarActions } from './AppBarActions';

const DRAWER_WIDTH = 240;

export function AdminLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const items = useMemo(
    () => [
      { to: '/admin', icon: <DashboardIcon />, label: t('nav.dashboard'), end: true },
      { to: '/admin/properties', icon: <ApartmentIcon />, label: t('nav.properties'), end: false },
      { to: '/admin/maintenance', icon: <BuildIcon />, label: t('nav.maintenance'), end: false },
      { to: '/admin/chat', icon: <ChatIcon />, label: t('nav.chat'), end: false },
      { to: '/admin/economy', icon: <AttachMoneyIcon />, label: t('nav.economy'), end: false },
      { to: '/admin/bookings', icon: <EventNoteIcon />, label: t('nav.bookings'), end: false },
    ],
    [t],
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('nav.admin')}
          </Typography>
          <AppBarActions />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {items.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={
                item.end
                  ? pathname === item.to
                  : pathname === item.to || pathname.startsWith(`${item.to}/`)
              }
              end={item.end}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
