import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { OnboardingPage } from '@/features/auth/OnboardingPage';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { AdminMaintenancePage } from '@/features/maintenance/AdminMaintenancePage';
import { ResidentMaintenancePage } from '@/features/maintenance/ResidentMaintenancePage';
import { AdminChatPage } from '@/features/chat/AdminChatPage';
import { ResidentChatPage } from '@/features/chat/ResidentChatPage';
import { AdminLayout } from '@/components/AdminLayout';
import { ResidentLayout } from '@/components/ResidentLayout';
import { RequirePending, RequireRole, RootRedirect } from '@/auth/guards';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={<RequirePending><OnboardingPage /></RequirePending>}
      />
      <Route
        path="/admin"
        element={<RequireRole roles={['admin', 'staff']}><AdminLayout /></RequireRole>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="maintenance" element={<AdminMaintenancePage />} />
        <Route path="chat" element={<AdminChatPage />} />
      </Route>
      <Route
        element={<RequireRole roles={['resident']}><ResidentLayout /></RequireRole>}
      >
        <Route path="/home" element={<ResidentHome />} />
        <Route path="/maintenance" element={<ResidentMaintenancePage />} />
        <Route path="/chat" element={<ResidentChatPage />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
