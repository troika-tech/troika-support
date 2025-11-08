import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/auth/LoginNew';
import TrainingGround from './pages/training/TrainingGround';
import Simulation from './pages/training/Simulation';
import SalesCaptainWhatsApp from './pages/sales/SalesCaptainWhatsApp';
import SalesCaptainAIAgent from './pages/sales/SalesCaptainAIAgent';

// Components
import DashboardLayout from './components/layout/DashboardLayout';

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Main user experience */}
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/sales-captain/whatsapp" replace />} />
        <Route path="training-ground" element={<TrainingGround />} />
        <Route path="simulation" element={<Simulation />} />
        <Route path="sales-captain/whatsapp" element={<SalesCaptainWhatsApp />} />
        <Route path="sales-captain/ai-agent" element={<SalesCaptainAIAgent />} />
        {/* Add more routes */}
      </Route>

      {/* 404 */}
      <Route path="*" element={<div>404 - Not Found</div>} />
    </Routes>
  );
}

export default App;
