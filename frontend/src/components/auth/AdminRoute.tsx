import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { token, user, isLoading } = useAuth();
  const localToken = localStorage.getItem('token');
  const hasAuthToken = Boolean(token || localToken);
  const role = String(user?.role ?? '').trim().toLowerCase();
  let localRole = '';
  try {
    const localUser = JSON.parse(localStorage.getItem('user') ?? '{}') as { role?: string };
    localRole = String(localUser?.role ?? '').trim().toLowerCase();
  } catch {
    localRole = '';
  }
  const isAdmin = role.includes('admin') || localRole.includes('admin');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAuthToken) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
