import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center py-8">
        <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 mx-auto flex items-center justify-center text-neutral-600 mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">404</h1>
        <p className="text-sm font-semibold text-neutral-800 mt-1">Page not found</p>
        <p className="text-xs text-neutral-500 mt-2 mb-6">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/login">
          <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Sign in
          </Button>
        </Link>
      </Card>
    </div>
  );
};
