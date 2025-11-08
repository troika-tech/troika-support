import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin (super_admin role)
  if (user.role !== 'super_admin') {
    return <Navigate to="/sales-captain/whatsapp" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

