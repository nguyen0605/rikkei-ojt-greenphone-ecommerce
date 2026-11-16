import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Spin, Result, Tag } from 'antd';
import {
  Printer,
  Home,
  FileText,
  ShieldCheck,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { orderService } from '@/services/orderService';
import type { OrderDTO } from '@/types/api';
import { InvoicePrintContent } from '@/components/order/InvoicePrintModal';

export const PublicInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchInvoice = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getPublicInvoice(id);
      // res may be wrapped in ApiResponse or direct data depending on interceptor
      const orderData = (res as any)?.data || res;
      setOrder(orderData);
    } catch (err: any) {
      console.error('Lỗi tải hóa đơn điện tử:', err);
      setError(
        err?.response?.data?.message ||
          'Không tìm thấy thông tin hóa đơn cho đơn hàng này hoặc đường dẫn tra cứu không hợp lệ.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-3 sm:px-6 font-sans">
      {/* Dedicated Print CSS for standalone Public Invoice page */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            width: 100% !important;
            height: auto !important;
          }
          header,
          footer,
          nav,
          .no-print {
            display: none !important;
          }
          .public-invoice-container {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          #greenphone-invoice-print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #374151 !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Spin size="large" />
          <p className="text-sm text-gray-500 font-medium">Đang truy xuất hóa đơn điện tử...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="max-w-xl mx-auto my-12 bg-white p-8 rounded-2xl shadow-xs border border-gray-200">
          <Result
            status="warning"
            title="Không tìm thấy hóa đơn điện tử"
            subTitle={error}
            extra={[
              <Link to="/" key="home">
                <Button type="primary" icon={<Home className="w-4 h-4" />}>
                  Về trang chủ
                </Button>
              </Link>,
              <Button key="retry" icon={<RotateCcw className="w-4 h-4" />} onClick={fetchInvoice}>
                Thử lại
              </Button>,
            ]}
          />
        </div>
      )}

      {/* Invoice Content */}
      {!loading && order && (
        <div className="max-w-4xl mx-auto public-invoice-container">
          {/* Top Navigation & Action Bar */}
          <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-gray-900 m-0">
                    Cổng tra cứu Hóa đơn điện tử #{order.id}
                  </h1>
                  <Tag color="green" className="!font-semibold !rounded-full">
                    Bản điện tử hợp lệ
                  </Tag>
                </div>
                <p className="text-xs text-gray-500 m-0">
                  Hóa đơn giá trị gia tăng chính thức lưu trữ tại GreenPhone. Nhấn "In hóa đơn" để in hoặc lưu file PDF.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/">
                <Button icon={<Home className="w-4 h-4" />}>
                  Trang chủ
                </Button>
              </Link>
              <Button
                type="primary"
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
                className="!bg-emerald-600 hover:!bg-emerald-700 !font-semibold !rounded-lg"
              >
                In hóa đơn / Lưu PDF (Ctrl+P)
              </Button>
            </div>
          </div>

          {/* Central Invoice Document */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <InvoicePrintContent
              order={order}
              isAdminView={false}
              printRef={printRef}
            />
          </div>

          {/* Bottom Security Note */}
          <div className="no-print mt-4 text-center text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-gray-600 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hóa đơn điện tử được ký số bảo mật và có giá trị pháp lý theo Nghị định 123/2020/NĐ-CP</span>
            </div>
            <p>Mọi thắc mắc về thuế và đối soát hóa đơn xin liên hệ: ketoan@greenphone.vn hoặc Hotline 1900 6868</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicInvoicePage;
