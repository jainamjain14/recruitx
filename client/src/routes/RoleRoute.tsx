import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth';
import { Spinner } from '../components/ui/Spinner';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const fallbackDashboard =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'recruiter'
        ? '/recruiter'
        : '/student';

    return <Navigate to={fallbackDashboard} replace />;
  }

  return <Outlet />;
};
