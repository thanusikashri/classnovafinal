import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const { user } = useAuth();
  const dashboardPath = user ? `/${user.role}-dashboard` : '/login';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 font-sans">
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-4">
        <AlertTriangle size={48} />
      </div>
      <h1 className="text-3xl font-extrabold text-content tracking-tight mb-2">404 — Page Not Found</h1>
      <p className="text-sm text-muted max-w-md mb-8">
        The page you are trying to access does not exist, has been relocated, or is outside your current role permissions.
      </p>

      <div className="flex items-center gap-3">
        <Link
          to={dashboardPath}
          className="btn-primary text-sm flex items-center gap-2 shadow-sm"
        >
          <Home size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
