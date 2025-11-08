import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material';
import {
  Insights as InsightsIcon,
  MenuBook as KnowledgeIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard', icon: <InsightsIcon />, path: '/admin/dashboard' },
    { text: 'Knowledge Base', icon: <KnowledgeIcon />, path: '/admin/knowledge-base' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="aside"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: drawerWidth,
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={700} color="primary">
            Admin Panel
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sales Captain Control Center
          </Typography>
        </Box>

        <Divider />

        <List sx={{ px: 1, py: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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
                      bgcolor: 'primary.dark'
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText'
                    }
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive(item.path) ? 'primary.contrastText' : 'text.secondary'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
          {/* <Box sx={{ mt: 'auto' }}>
            <Divider sx={{ mb: 1.5 }} />
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  borderRadius: 1,
                  color: 'error.main',
                  '& .MuiListItemIcon-root': {
                    color: 'error.main'
                  },
                  '&:hover': {
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                    '& .MuiListItemIcon-root': {
                      color: 'error.contrastText'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </Box> */}
        </List>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', ml: `${drawerWidth}px` }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default AdminLayout;

