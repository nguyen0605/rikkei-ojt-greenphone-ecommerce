import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Copy,
  Check,
  Package,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { message } from 'antd';
import { shipmentService } from '@/services/shipmentService';
import type { ShipmentDTO, ShipmentHistoryDTO } from '@/types/api';
import { formatDate } from '@/utils';

interface ShipmentTrackingCardProps {
  orderId: number;
  orderStatus?: string;
  isAdmin?: boolean;
  className?: string;
}

const CARRIER_CONFIG: Record<
  string,
  { name: string; badgeClass: string; borderClass: string; textClass: string }
> = {
  GHN: {
    name: 'Giao Hàng Nhanh (GHN)',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    borderClass: 'border-orange-200',
    textClass: 'text-orange-700',
  },
  GHTK: {
    name: 'Giao Hàng Tiết Kiệm (GHTK)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-700',
  },
  VIETTEL_POST: {
    name: 'Viettel Post',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    borderClass: 'border-red-200',
    textClass: 'text-red-700',
  },
  VNPOST: {
    name: 'VNPost',
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    borderClass: 'border-yellow-200',
    textClass: 'text-yellow-800',
  },
  'J&T': {
    name: 'J&T Express',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-700',
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  READY_TO_SHIP: {
    label: 'Chờ lấy hàng',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  PICKED_UP: {
    label: 'Đã nhận kiện hàng',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  DELIVERING: {
    label: 'Đang giao hàng',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
  },
  DELIVERED: {
    label: 'Giao thành công',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  RETURNED: {
    label: 'Chuyển hoàn',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  FAILED: {
    label: 'Giao thất bại',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

export const ShipmentTrackingCard: React.FC<ShipmentTrackingCardProps> = ({
  orderId,
  orderStatus,
  isAdmin = false,
  className = '',
}) => {
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [expandedShipments, setExpandedShipments] = useState<Record<number, boolean>>({});

  const {
    data: shipments,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [isAdmin ? 'admin-shipments' : 'shipments', orderId],
    queryFn: () => (isAdmin ? shipmentService.adminGetByOrderId(orderId) : shipmentService.getByOrderId(orderId)),
    enabled: !!orderId,
  });

  const handleCopy = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    setCopiedTracking(trackingNumber);
    message.success(`Đã sao chép mã vận đơn: ${trackingNumber}`);
    setTimeout(() => {
      setCopiedTracking(null);
    }, 2000);
  };

  const toggleExpand = (id: number) => {
    setExpandedShipments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-xs ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-5 w-5 text-gray-400 animate-pulse" />
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  // Nếu không có kiện hàng hoặc lỗi
  if (isError || !shipments || shipments.length === 0) {
    // Nếu đơn hàng đang PENDING hoặc CONFIRMED, thông báo kiện hàng chưa được tạo
    if (orderStatus === 'PENDING' || orderStatus === 'CONFIRMED') {
      return (
        <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-xs ${className}`}>
          <div className="flex items-center gap-2.5 text-gray-900 font-bold text-sm mb-2">
            <Truck className="h-4 w-4 text-emerald-600" />
            <span>Thông tin vận chuyển</span>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-800 flex items-start gap-2.5">
            <Package className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Đơn hàng đang chuẩn bị đóng gói</p>
              <p className="mt-0.5 text-blue-700 leading-relaxed">
                Sau khi cửa hàng hoàn tất đóng gói và bàn giao bưu tá, mã vận đơn và hành trình giao hàng sẽ được cập nhật tại đây.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (orderStatus === 'CANCELLED') {
      return null;
    }

    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {shipments.map((shipment: ShipmentDTO) => {
        const carrier = CARRIER_CONFIG[shipment.carrierCode] || {
          name: shipment.carrierCode || 'Đơn vị vận chuyển',
          badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
          borderClass: 'border-gray-200',
          textClass: 'text-gray-700',
        };

        const status = STATUS_CONFIG[shipment.status] || {
          label: shipment.status,
          badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
          dotClass: 'bg-gray-400',
        };

        const isExpanded = expandedShipments[shipment.id] ?? true; // Mặc định mở rộng để xem lịch sử
        const histories = shipment.histories || [];

        return (
          <div
            key={shipment.id}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs"
          >
            {/* Header Vận đơn */}
            <div className="border-b border-gray-100 bg-gray-50/50 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        Kiện hàng #{shipment.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${carrier.badgeClass}`}
                      >
                        {carrier.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Mã vận đơn:</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">
                        {shipment.trackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(shipment.trackingNumber)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                        title="Sao chép mã vận đơn"
                      >
                        {copiedTracking === shipment.trackingNumber ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedTracking === shipment.trackingNumber ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                    {status.label}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(shipment.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    title={isExpanded ? 'Thu gọn hành trình' : 'Xem chi tiết hành trình'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Thông tin thời gian dự kiến & COD */}
              <div className="mt-3.5 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                {shipment.estimatedDeliveryAt && (
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>Dự kiến giao: </span>
                    <span className="font-semibold text-emerald-700">
                      {formatDate(shipment.estimatedDeliveryAt)}
                    </span>
                  </div>
                )}
                {shipment.deliveredAt && (
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                    <span>Đã nhận lúc: </span>
                    <span className="font-semibold">{formatDate(shipment.deliveredAt)}</span>
                  </div>
                )}
                {shipment.note && (
                  <div className="col-span-1 sm:col-span-2 text-gray-500 italic">
                    Ghi chú bưu tá: {shipment.note}
                  </div>
                )}
              </div>
            </div>

            {/* Chi tiết hành trình Timeline */}
            {isExpanded && (
              <div className="p-4 sm:p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Hành trình bưu kiện</span>
                </div>

                {histories.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-400">
                    Chưa có lịch sử cập nhật hành trình cho bưu kiện này.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-emerald-200 ml-2.5 pl-4 sm:pl-5 space-y-4">
                    {histories.map((hist: ShipmentHistoryDTO, idx: number) => {
                      const isLatest = idx === 0;
                      const histStatus = STATUS_CONFIG[hist.status] || {
                        label: hist.status,
                        badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
                        dotClass: 'bg-gray-400',
                      };

                      return (
                        <div key={hist.id || idx} className="relative group">
                          {/* Dot */}
                          <div
                            className={`absolute -left-[23px] sm:-left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white transition-all ${
                              isLatest
                                ? 'bg-emerald-600 ring-4 ring-emerald-100'
                                : 'bg-gray-300'
                            }`}
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isLatest ? 'text-gray-900' : 'text-gray-700'
                                }`}
                              >
                                {histStatus.label}
                              </span>

                              {hist.hubLocation && (
                                <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
                                  <MapPin className="h-3 w-3 text-gray-500" />
                                  {hist.hubLocation}
                                </span>
                              )}

                              <span className="text-[11px] text-gray-400">
                                {formatDate(hist.createdAt)}
                              </span>
                            </div>

                            {hist.shipperNote && (
                              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                                {hist.shipperNote}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ShipmentTrackingCard;

