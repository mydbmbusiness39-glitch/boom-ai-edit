import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * TEST MODE: bypasses auth so anyone can test the app without an account.
 * Remove/revert when Supabase is connected for real.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // TEST MODE — always allow access
  return <>{children}</>;
};

export default ProtectedRoute;
