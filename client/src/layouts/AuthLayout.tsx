import React from 'react';
import { Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <Logo size="md" />
        <span className="text-xs font-medium text-neutral-400">Secure Access</span>
      </header>

      {/* Main Form Content */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-4 border-t border-neutral-200/60">
        <p className="text-xs text-neutral-400">
          &copy; {new Date().getFullYear()} RecruitX System. All rights reserved. Trust & Privacy Guaranteed.
        </p>
      </footer>
    </div>
  );
};
