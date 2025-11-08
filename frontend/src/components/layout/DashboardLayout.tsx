import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider
} from '@mui/material';
import {
  SportsMma as TrainingGroundIcon,
  PlayCircle as SimulationIcon,
  WhatsApp as WhatsAppIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material';

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Training Ground', icon: <TrainingGroundIcon />, path: '/training-ground' },
    { text: 'Simulation', icon: <SimulationIcon />, path: '/simulation' },
    { text: 'SC - WhatsApp', icon: <WhatsAppIcon />, path: '/sales-captain/whatsapp' },
    { text: 'SC - AI Agent', icon: <AIIcon />, path: '/sales-captain/ai-agent' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isFullBleedPage = [
    '/sales-captain/whatsapp',
    '/sales-captain/ai-agent',
    '/training-ground',
  ].includes(location.pathname);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        component="aside"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '240px',
          height: '100vh',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          zIndex: 1000,
        }}
      >
        {/* Logo/Title */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Sales Captain
          </Typography>
          <Typography variant="caption" color="text.secondary">
            AI Sales Training
          </Typography>
        </Box>

        <Divider />

        {/* Navigation */}
        <List sx={{ px: 1, py: 2 }}>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive(item.path)}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive(item.path) ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        {/* <Box sx={{ mt: 'auto', px: 1, pb: 3 }}>
          <Divider sx={{ mb: 1.5 }} />
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 1,
                color: 'error.main',
                '& .MuiListItemIcon-root': {
                  color: 'error.main',
                },
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'error.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'error.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </Box> */}
      </Box>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', ml: '240px' }}>
        {/* Page content */}
        <Container
          maxWidth={isFullBleedPage ? false : 'xl'}
          disableGutters={isFullBleedPage}
          sx={{
            mt: isFullBleedPage ? 0 : 4,
            mb: isFullBleedPage ? 0 : 4,
            px: isFullBleedPage ? 0 : undefined,
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
