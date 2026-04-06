import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRole = user.user_metadata?.role || 'user';
    if (!roles.includes(userRole)) {
      return (
        <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-4">🚫</p>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/50 mb-6">You don't have permission to view this page.</p>
            <a href="/" className="px-6 py-3 bg-[#00D9FF] text-[#0A1128] font-bold rounded-xl">Go Home</a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
