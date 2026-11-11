import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { ROUTES } from '@/routes/routePaths';
import { Result, Button } from 'antd';

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function RequireRole({ children, allowedRoles }: RequireRoleProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  const userRole = user?.role || 'ROLE_CUSTOMER';
  const hasPermission = allowedRoles.includes(userRole);

  if (!hasPermission) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle="Tài khoản của bạn không có đủ thẩm quyền để truy cập vào phân hệ quản trị này."
          extra={
            <Button type="primary" href={ROUTES.ADMIN}>
              Về trang tổng quan
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
