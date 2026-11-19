import React, { useRef } from 'react';
import { Modal, Button, Space } from 'antd';
import {
  DownloadOutlined,
  CloseOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { FinancialReport, TopSellingPhone } from '@/types/api';
import { formatVND } from '@/utils';

export interface DashboardPdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  month: Dayjs;
  rows: { label: string; value: number | string; monetary?: boolean }[];
  topProducts: TopSellingPhone[];
  financial?: FinancialReport;
  role?: string;
  userFullName?: string;
  filename: string;
}

export default function DashboardPdfPreviewModal({
  open,
  onClose,
  onDownload,
  month,
  rows,
  topProducts,
  financial,
  role,
  userFullName,
}: DashboardPdfPreviewModalProps) {
  const currentDateFormatted = dayjs().format('DD/MM/YYYY HH:mm');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Báo cáo Doanh thu - GreenPhone</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 10px; font-size: 12px; }
            th { background: #065f46; color: #ffffff; font-weight: bold; text-align: left; }
            .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  const channelPalette: Record<string, string> = {
    VIETQR: '#10b981',
    VNPAY: '#0284c7',
    MOMO: '#ec4899',
    COD: '#f59e0b',
    BANK_TRANSFER: '#6366f1',
  };

  const paymentStats = financial?.paymentMethodStats ?? [];
  const totalPaymentRev = paymentStats.reduce((s, r) => s + r.revenue, 0);

  // Phân chia 3 nhóm KPI
  const finRow = rows.find((r) => r.label === 'Doanh thu thuần');
  const financialCards: { label: string; value: string | number; note?: string }[] = [];
  if (finRow) {
    financialCards.push({
      label: 'Doanh thu thuần',
      value: typeof finRow.value === 'number' ? formatVND(finRow.value) : finRow.value,
      note: 'Thực nhận sau giảm giá',
    });
  }
  if (financial) {
    if (financial.grossProfit !== null && financial.grossProfit !== undefined) {
      financialCards.push({
        label: 'Lợi nhuận gộp',
        value: formatVND(financial.grossProfit),
        note: 'Sau giá vốn hàng bán',
      });
    }
    if (financial.profitMarginPercentage !== null && financial.profitMarginPercentage !== undefined) {
      financialCards.push({
        label: 'Biên lợi nhuận',
        value: `${financial.profitMarginPercentage}%`,
        note: 'Tỷ suất lợi nhuận / Doanh thu',
      });
    }
    financialCards.push({
      label: 'Doanh thu gộp',
      value: formatVND(financial.grossRevenue),
      note: 'Tổng tiền trước chiết khấu',
    });
  }

  const operationalCards = rows.filter((r) => !r.monetary && typeof r.value === 'number');

  const costCards = financial
    ? [
        {
          label: 'Giá vốn hàng bán (COGS)',
          value: financial.cogs !== null && financial.cogs !== undefined ? formatVND(financial.cogs) : 'Chưa đủ dữ liệu',
        },
        { label: 'Phí vận chuyển', value: formatVND(financial.shippingFee) },
        { label: 'Giảm giá', value: formatVND(financial.discountAmount) },
        { label: 'Tiền hoàn trả', value: formatVND(financial.refundAmount) },
      ]
    : [];

  const maxSold = Math.max(...(topProducts ?? []).map((p) => p.soldQuantity), 1);
  let sectionIndex = 1;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={920}
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <FilePdfOutlined className="text-emerald-600 text-lg" />
          <span className="font-bold text-base">Xem trước báo cáo PDF</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Khổ chuẩn A4 (210 x 297 mm) · Tỷ lệ 1 : 1.414 · Độ nét cao 300 DPI
          </span>
          <Space>
            <Button aria-label="Đóng" onClick={onClose} icon={<CloseOutlined />} className="!rounded-full">
              Đóng
            </Button>
            <Button
              aria-label="In báo cáo"
              onClick={handlePrint}
              icon={<PrinterOutlined />}
              className="!rounded-full"
            >
              In trực tiếp
            </Button>
            <Button
              aria-label="Tải xuống PDF"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={onDownload}
              className="!rounded-full !bg-emerald-600 hover:!bg-emerald-700 font-semibold shadow-sm"
            >
              Tải xuống PDF
            </Button>
          </Space>
        </div>
      }
      styles={{ body: { maxHeight: '82vh', overflowY: 'auto', padding: '16px', background: '#f1f5f9' } }}
    >
      <div className="flex justify-center">
        {/* Paper Container - Khổ A4 Styling */}
        <div
          ref={printRef}
          className="bg-white rounded-lg shadow-md border border-slate-200 p-8 sm:p-10 text-slate-800 text-sm w-full max-w-[840px]"
        >
          {/* Header Banner GreenPhone */}
          <div className="bg-emerald-800 text-white rounded-xl p-6 mb-7 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold tracking-widest text-emerald-200 uppercase block">
                  GreenPhone Enterprise Retail System
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  BÁO CÁO HOẠT ĐỘNG KINH DOANH
                </h2>
              </div>
              <div className="text-left sm:text-right text-xs text-emerald-100 space-y-1">
                <div>
                  Kỳ báo cáo: <strong className="text-white text-sm">Tháng {month.format('MM/YYYY')}</strong>
                </div>
                <div>Thời gian xuất: {currentDateFormatted}</div>
                <div>
                  Người xuất: <span className="text-emerald-200 font-medium">{userFullName || 'Quản trị viên'}</span>
                  {role && <span className="ml-1 text-[11px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-300">({role})</span>}
                </div>
              </div>
            </div>
          </div>

          {/* NHÓM 1: KPI TÀI CHÍNH CỐT LÕI */}
          {financialCards.length > 0 && (
            <div className="mb-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 border-b border-slate-200 pb-2">
                <CheckCircleFilled className="text-emerald-600" />
                <span>{sectionIndex++}. Hiệu quả tài chính cốt lõi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {financialCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between shadow-xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600" />
                    <span className="text-xs text-emerald-900 font-semibold">{card.label}</span>
                    <span className="text-lg font-black text-emerald-950 mt-1">{card.value}</span>
                    {card.note && <span className="text-[11px] text-emerald-700 mt-0.5">{card.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NHÓM 2: VẬN HÀNH ĐƠN HÀNG */}
          <div className="mb-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 border-b border-slate-200 pb-2">
              <CheckCircleFilled className="text-emerald-600" />
              <span>{sectionIndex++}. Vận hành đơn hàng (Số lượng theo trạng thái)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {operationalCards.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/80 flex flex-col justify-between shadow-xs relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <span className="text-xs text-slate-500 font-medium truncate">{row.label}</span>
                  <span className="text-base font-bold text-slate-900 mt-1">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NHÓM 3: CHI PHÍ VẬN HÀNH & HOÀN TRẢ */}
          {costCards.length > 0 && (
            <div className="mb-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 border-b border-slate-200 pb-2">
                <CheckCircleFilled className="text-emerald-600" />
                <span>{sectionIndex++}. Chi phí vận hành và hoàn trả</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {costCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-400" />
                    <span className="text-xs text-slate-600 font-medium truncate">{card.label}</span>
                    <span className="text-sm sm:text-base font-bold text-slate-800 mt-1">{card.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CƠ CẤU THANH TOÁN (Nếu có dữ liệu) */}
          {paymentStats.length > 0 && (
            <div className="mb-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 border-b border-slate-200 pb-2">
                <CheckCircleFilled className="text-emerald-600" />
                <span>{sectionIndex++}. Cơ cấu thanh toán theo kênh</span>
              </div>

              {/* Thanh phân đoạn tỷ trọng trực quan (Segmented Bar) */}
              <div className="mb-4">
                <div className="h-4 w-full flex rounded-full overflow-hidden shadow-inner bg-slate-100">
                  {paymentStats.map((item, idx) => {
                    const share = totalPaymentRev > 0 ? (item.revenue / totalPaymentRev) * 100 : 0;
                    const bg = channelPalette[item.paymentMethod.toUpperCase()] || '#8b5cf6';
                    return (
                      <div
                        key={idx}
                        style={{ width: `${share}%`, backgroundColor: bg }}
                        title={`${item.paymentMethod}: ${share.toFixed(1)}%`}
                        className="transition-all"
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-xs">
                  {paymentStats.map((item, idx) => {
                    const share = totalPaymentRev > 0 ? ((item.revenue / totalPaymentRev) * 100).toFixed(1) : '0.0';
                    const bg = channelPalette[item.paymentMethod.toUpperCase()] || '#8b5cf6';
                    return (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: bg }} />
                        <span className="font-semibold text-slate-800">{item.paymentMethod}</span>: {share}%
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-800 text-white font-bold border-b border-emerald-900">
                      <th className="py-2.5 px-3">Phương thức thanh toán</th>
                      <th className="py-2.5 px-3 text-right">Số giao dịch</th>
                      <th className="py-2.5 px-3 text-right">Doanh thu thực tế</th>
                      <th className="py-2.5 px-3 text-right">Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentStats.map((item, idx) => {
                      const share = totalPaymentRev > 0 ? ((item.revenue / totalPaymentRev) * 100).toFixed(1) : '0.0';
                      const bg = channelPalette[item.paymentMethod.toUpperCase()] || '#8b5cf6';
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: bg }} />
                            <span>{item.paymentMethod}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">{item.transactionCount ?? 0} GD</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatVND(item.revenue)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-sky-700">{share}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TOP SẢN PHẨM BÁN CHẠY (Huy hiệu Top 1..3 & Visual progress bar) */}
          <div className="mb-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 border-b border-slate-200 pb-2">
              <CheckCircleFilled className="text-emerald-600" />
              <span>{sectionIndex}. Top sản phẩm bán chạy nhất</span>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">Chưa có dữ liệu bán chạy trong kỳ.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-800 text-white font-bold border-b border-emerald-900">
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">Sản phẩm</th>
                      <th className="py-2.5 px-3">Hãng sản xuất</th>
                      <th className="py-2.5 px-3 text-right">Số lượng bán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.slice(0, 10).map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{p.phoneName}</td>
                        <td className="py-2 px-3 text-slate-500">{p.brandName || '—'}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${(p.soldQuantity / maxSold) * 100}%` }}
                              />
                            </div>
                            <span className="font-bold text-emerald-700">{p.soldQuantity} máy</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* KHU VỰC KÝ TÊN VÀ PHÊ DUYỆT (Căn đều 3 cột, khoảng cách tự nhiên) */}
          <div className="mt-8 pt-5 border-t border-slate-200 avoid-break">
            <div className="grid grid-cols-3 text-center text-xs">
              <div>
                <p className="font-bold text-slate-800 uppercase">Người lập biểu</p>
                <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-14" />
                <p className="font-medium text-slate-700">{userFullName || 'Quản trị viên'}</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 uppercase">Kế toán trưởng</p>
                <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-14" />
                <p className="text-slate-400">............................</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 uppercase">Giám đốc điều hành</p>
                <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký, đóng dấu)</p>
                <div className="h-14" />
                <p className="text-slate-400">............................</p>
              </div>
            </div>
          </div>

          {/* CHÂN TRANG TÀI LIỆU (FOOTER) */}
          <div className="mt-7 pt-3 border-t border-slate-200 flex justify-between text-[11px] text-slate-400">
            <span>Hệ thống Quản lý Bán lẻ Di động GreenPhone · Báo cáo kết xuất tự động</span>
            <span>Trang 1/1 · Lưu hành nội bộ</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
