import React from 'react';
import { Link } from 'react-router-dom';
import type { PhoneDTO } from '@/types/api';
import { Cpu, Battery, Eye } from 'lucide-react';

interface ChatProductCardProps {
  phone: PhoneDTO;
  onSelect?: () => void;
}

export const ChatProductCard: React.FC<ChatProductCardProps> = ({ phone, onSelect }) => {
  const formatPrice = (price: number | null | undefined) => {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  return (
    <div className="flex flex-col w-56 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="relative h-28 w-full bg-gray-50 flex items-center justify-center p-2">
        {phone.mainImageUrl ? (
          <img
            src={phone.mainImageUrl}
            alt={phone.name}
            className="h-full max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="text-gray-400 text-xs font-medium">Hình ảnh sản phẩm</div>
        )}
        {phone.brandName && (
          <span className="absolute top-1.5 left-1.5 bg-gray-900/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {phone.brandName}
          </span>
        )}
      </div>

      <div className="p-2.5 flex flex-col flex-1 justify-between">
        <div>
          <h4 className="text-xs font-semibold text-gray-800 line-clamp-1 title={phone.name}">
            {phone.name}
          </h4>
          <p className="text-sm font-bold text-emerald-600 mt-1">
            {formatPrice(phone.lowestPrice)}
          </p>

          <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-500">
            {phone.chip && (
              <div className="flex items-center gap-1 line-clamp-1">
                <Cpu className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{phone.chip}</span>
              </div>
            )}
            {phone.battery && (
              <div className="flex items-center gap-1 line-clamp-1">
                <Battery className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{phone.battery}</span>
              </div>
            )}
          </div>
        </div>

        <Link
          to={`/san-pham/${phone.id}`}
          onClick={onSelect}
          className="mt-2.5 inline-flex items-center justify-center gap-1 w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-200"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Xem chi tiết</span>
        </Link>
      </div>
    </div>
  );
};

export default ChatProductCard;
