import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import KnowledgeBase from './pages/dashboard/KnowledgeBase';
import Conversations from './pages/dashboard/Conversations';
import ConversationDetail from './pages/dashboard/ConversationDetail';
import Tickets from './pages/dashboard/Tickets';
import TicketDetail from './pages/dashboard/TicketDetail';
import Analytics from './pages/dashboard/Analytics';
import Settings from './pages/dashboard/Settings';
import Profile from './pages/dashboard/Profile';
import Team from './pages/dashboard/Team';
import Billing from './pages/dashboard/Billing';
import Notifications from './pages/dashboard/Notifications';
import Search from './pages/dashboard/Search';
import Integrations from './pages/dashboard/Integrations';
import AdminPanel from './pages/admin/AdminPanel';
import ChatDemo from './pages/ChatDemo';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/demo" element={<ChatDemo />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="conversations/:id" element={<ConversationDetail />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="team" element={<Team />} />
        <Route path="billing" element={<Billing />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="search" element={<Search />} />
        <Route path="integrations" element={<Integrations />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AdminPanel />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
