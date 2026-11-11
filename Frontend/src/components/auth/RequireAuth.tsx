import { useSelector } from 'react-redux';  
import { Navigate, useLocation } from 'react-router-dom';  
import type { ReactNode } from 'react';  
import { useAppSelector } from '@/store/hooks';  
  
type UserRole = 'CUSTOMER' | 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'MARKETING' | string;

const STAFF_ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'MARKETING', 'ROLE_ADMIN', 'ROLE_SALES', 'ROLE_WAREHOUSE', 'ROLE_MARKETING'];

interface RequireAuthProps {
  children: ReactNode;
  role?: UserRole;
  roles?: UserRole[];
}

export default function RequireAuth({ children, role, roles }: RequireAuthProps) {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname + location.search }} />;
  }

  const userRole = user.role || 'ROLE_CUSTOMER';
  const cleanRole = userRole.startsWith('ROLE_') ? userRole.substring(5) : userRole;

  if (roles && roles.length > 0) {
    const isAllowed = roles.some((r) => {
      const cleanR = r.startsWith('ROLE_') ? r.substring(5) : r;
      return cleanR === cleanRole || (r === 'STAFF' && STAFF_ROLES.includes(cleanRole));
    });
    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  } else if (role) {
    const cleanR = role.startsWith('ROLE_') ? role.substring(5) : role;
    const isAllowed =
      cleanR === cleanRole ||
      (cleanR === 'ADMIN' && STAFF_ROLES.includes(cleanRole)) ||
      (role === 'STAFF' && STAFF_ROLES.includes(cleanRole));

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
} 
