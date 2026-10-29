import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-9xl font-bold text-green-500">404</div>
        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Không tìm thấy trang
        </h1>
        <p className="mb-8 text-gray-600">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button
              type="primary"
              size="large"
              icon={<Home className="h-4 w-4" />}
              className="!rounded-full !bg-green-600 hover:!bg-green-700"
            >
              Về trang chủ
            </Button>
          </Link>
          <Link to="/san-pham">
            <Button
              size="large"
              icon={<Search className="h-4 w-4" />}
              className="!rounded-full !border-green-600 !text-green-600 hover:!bg-green-50"
            >
              Xem sản phẩm
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
