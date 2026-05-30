import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { ResidentHome } from '@/features/dashboard/ResidentHome';
import { RequireRole, RootRedirect } from '@/auth/guards';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={<RequireRole roles={['admin', 'staff']}><AdminDashboard /></RequireRole>}
      />
      <Route
        path="/home"
        element={<RequireRole roles={['resident']}><ResidentHome /></RequireRole>}
      />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
