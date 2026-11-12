import React from 'react';
import { Modal, Tag, Button } from 'antd';
import { MapPin, Check, Plus, User, Phone, CheckCircle2, Home, Building2, Heart, HelpCircle } from 'lucide-react';
import type { AddressItem, AddressLabel } from '@/types/api';
import { formatFullAddress } from '@/services/userService';

const LABEL_BADGES: Record<AddressLabel, { text: string; color: string; icon: typeof Home }> = {
  HOME: { text: 'Nhà riêng', color: 'blue', icon: Home },
  OFFICE: { text: 'Văn phòng', color: 'purple', icon: Building2 },
  FAMILY: { text: 'Người thân', color: 'orange', icon: Heart },
  OTHER: { text: 'Khác', color: 'default', icon: HelpCircle },
};

export interface AddressSelectModalProps {
  open: boolean;
  onClose: () => void;
  addresses: AddressItem[];
  selectedAddressId: string | number | 'custom' | null;
  onSelectAddress: (address: AddressItem) => void;
  onSelectCustomAddress?: () => void;
  onOpenAddNew?: () => void;
}

export const AddressSelectModal: React.FC<AddressSelectModalProps> = ({
  open,
  onClose,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onSelectCustomAddress,
  onOpenAddNew,
}) => {
  return (
    <Modal
      title={
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 pr-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900">Địa chỉ nhận hàng của bạn</span>
              <p className="text-xs text-gray-500 font-normal">
                Danh sách địa chỉ đã lưu trong sổ địa chỉ của bạn ({addresses.length} địa chỉ)
              </p>
            </div>
          </div>
          {onOpenAddNew && (
            <Button
              type="primary"
              size="small"
              icon={<Plus className="h-3.5 w-3.5" />}
              className="!bg-green-600 hover:!bg-green-700 !rounded-lg !text-xs font-semibold"
              onClick={() => {
                onClose();
                onOpenAddNew();
              }}
            >
              Thêm địa chỉ mới
            </Button>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      centered
      width={640}
      className="max-w-xl"
    >
      <div className="max-h-[60vh] overflow-y-auto space-y-3 py-3 pr-1">
        {addresses.map((addr) => {
          const isSelected = selectedAddressId === addr.id;
          const fullText = formatFullAddress(addr);
          const labelKey = (addr.label as AddressLabel) || 'HOME';
          const badge = LABEL_BADGES[labelKey] || LABEL_BADGES.HOME;
          const hasCoords =
            typeof addr.latitude === 'number' &&
            typeof addr.longitude === 'number' &&
            Number.isFinite(addr.latitude) &&
            Number.isFinite(addr.longitude);

          return (
            <div
              key={addr.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelectAddress(addr);
                onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAddress(addr);
                  onClose();
                }
              }}
              className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-green-600 bg-green-50/50 shadow-sm ring-2 ring-green-600/30'
                  : 'border-gray-200 bg-white hover:border-green-500 hover:bg-gray-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 font-bold text-gray-900 text-sm">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      {addr.receiverName}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {addr.receiverPhone}
                    </span>

                    <Tag
                      color={badge.color}
                      className="!rounded-md !px-1.5 !py-0 !text-xs !font-medium"
                    >
                      {badge.text}
                    </Tag>

                    {addr.isDefault && (
                      <Tag
                        color="success"
                        className="!inline-flex !items-center !gap-1 !rounded-full !px-2 !py-0 !text-xs !font-semibold !border-green-200"
                      >
                        <CheckCircle2 className="h-3 w-3 text-green-600" /> Mặc định
                      </Tag>
                    )}

                    {hasCoords ? (
                      <Tag
                        color="cyan"
                        className="!inline-flex !items-center !gap-0.5 !rounded-md !px-1.5 !py-0 !text-xs"
                      >
                        <MapPin className="h-3 w-3" /> Đã ghim
                      </Tag>
                    ) : (
                      <Tag className="!rounded-md !px-1.5 !py-0 !text-xs text-gray-400">
                        Chưa ghim
                      </Tag>
                    )}
                  </div>

                  <div className="flex items-start gap-1.5 text-xs text-gray-700">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="break-words font-medium">{fullText}</span>
                  </div>

                  {addr.note && (
                    <p className="text-xs text-gray-500 italic">Ghi chú: {addr.note}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="small"
                    type={isSelected ? 'primary' : 'default'}
                    className={`!rounded-lg !text-xs font-semibold ${
                      isSelected
                        ? '!bg-green-600 hover:!bg-green-700'
                        : '!border-green-600 !text-green-600 hover:!bg-green-50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAddress(addr);
                      onClose();
                    }}
                  >
                    Giao đến địa chỉ này
                  </Button>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 group-hover:border-gray-400'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Lựa chọn nhập địa chỉ khác */}
        {onSelectCustomAddress && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectCustomAddress();
              onClose();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectCustomAddress();
                onClose();
              }
            }}
            className={`group cursor-pointer rounded-xl border p-4 transition-all ${
              selectedAddressId === 'custom'
                ? 'border-green-600 bg-green-50/40 ring-1 ring-green-600 shadow-sm'
                : 'border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    selectedAddressId === 'custom'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Nhập địa chỉ giao hàng khác cho đơn này
                  </p>
                  <p className="text-xs text-gray-500">
                    Tùy chỉnh họ tên, số điện thoại và địa chỉ giao hàng riêng
                  </p>
                </div>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                  selectedAddressId === 'custom'
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 group-hover:border-gray-400'
                }`}
              >
                {selectedAddressId === 'custom' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AddressSelectModal;
