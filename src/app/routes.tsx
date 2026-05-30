import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { OnboardingPage } from '@/features/auth/OnboardingPage';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage';
import { AdminLayout } from '@/components/AdminLayout';
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
      </Route>
      <Route
        path="/home"
        element={<RequireRole roles={['resident']}><ResidentHome /></RequireRole>}
      />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
