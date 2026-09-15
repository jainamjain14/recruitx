import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui/Spinner';

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    const roleDashboard =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'recruiter'
        ? '/recruiter'
        : '/student';

    return <Navigate to={roleDashboard} replace />;
  }

  return <Outlet />;
};
