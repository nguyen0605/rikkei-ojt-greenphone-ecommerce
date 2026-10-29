import { useSelector } from 'react-redux';  
import { Navigate, useLocation } from 'react-router-dom';  
import type { ReactNode } from 'react';  
import { useAppSelector } from '@/store/hooks';  
  
type UserRole = 'CUSTOMER' | 'ADMIN';  
 
interface RequireAuthProps { children: ReactNode; role?: UserRole; }  
  
export default function RequireAuth({ children, role }: RequireAuthProps) {  
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);  
  const location = useLocation();  
  if (!isAuthenticated || !user) {  
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname + location.search }} />;  
  }  
  if (role && user.role !== role) {  
    return <Navigate to="/" replace />;  
  }  
  return <>{children}</>;  
} 
