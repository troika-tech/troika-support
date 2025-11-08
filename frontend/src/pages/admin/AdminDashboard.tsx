import { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, Stack, CircularProgress, Alert } from '@mui/material';
import adminService, { DashboardStats } from '../../services/admin.service';

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await adminService.getDashboardStats();
        setStats(data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard statistics');
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    { label: 'Active Users', value: stats.activeUsers.value.toString(), trend: stats.activeUsers.trend },
    { label: 'Teams Onboarded', value: stats.teams.value.toString(), trend: stats.teams.trend },
    { label: 'Knowledge Articles', value: stats.knowledgeArticles.value.toString(), trend: stats.knowledgeArticles.trend },
    { label: 'Pending Reviews', value: stats.pendingReviews.value.toString(), trend: stats.pendingReviews.trend },
  ];

  return (
  <Stack spacing={4} sx={{ py: 4 }}>
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Monitor usage, manage content, and review the overall health of the Sales Captain platform.
      </Typography>
    </Box>

    <Grid container spacing={3}>
      {statCards.map(({ label, value, trend }) => (
        <Grid item xs={12} sm={6} md={3} key={label}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="overline" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={600} sx={{ mt: 1 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
              {trend}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            minHeight: 260
          }}
        >
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Platform Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This area can display charts or analytics such as conversation volume, training completion rates,
            or AI usage over time. Hook up your preferred data source and visualization library to bring this to life.
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            minHeight: 260
          }}
        >
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Provide shortcuts for reviewers, content managers, or administrators. Think of actions like adding
            new knowledge articles, approving pending updates, or reviewing recent escalations.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  </Stack>
  );
};

export default AdminDashboard;

