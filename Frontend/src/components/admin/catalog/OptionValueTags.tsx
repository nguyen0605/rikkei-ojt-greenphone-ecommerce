import { useState } from 'react';
import {
  Tag,
  Input,
  Button,
  ColorPicker,
  Modal,
  Popconfirm,
  message,
  Spin,
  Table,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  BgColorsOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { OptionDTO, OptionItemDTO, PhoneDTO, PageResponse } from '@/types/api';
import adminCatalogService from '@/services/adminCatalogService';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

interface OptionValueTagsProps {
  category: OptionDTO;
  items: OptionItemDTO[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export default function OptionValueTags({
  category,
  items,
  isLoading = false,
  onRefresh,
}: OptionValueTagsProps) {
  const isColor = category.type === 'COLOR';

  // Input states for adding new value
  const [newValue, setNewValue] = useState('');
  const [newHexColor, setNewHexColor] = useState('#8a857e');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Foreign Key Warning Modal state
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningItem, setWarningItem] = useState<OptionItemDTO | null>(null);
  const [warningErrorMsg, setWarningErrorMsg] = useState('');
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePhones, setUsagePhones] = useState<PhoneDTO[]>([]);

  const handleAddValue = async () => {
    const trimmedVal = newValue.trim();
    if (!trimmedVal) {
      message.warning('Vui lòng nhập giá trị thuộc tính');
      return;
    }

    // Check duplicate
    if (items.some((i) => i.value.trim().toLowerCase() === trimmedVal.toLowerCase())) {
      message.error(`Giá trị "${trimmedVal}" đã tồn tại trong nhóm này!`);
      return;
    }

    // Color HEX validation rule: ❌ CẤM lưu mã màu sắc không đúng định dạng mã HEX (#RRGGBB).
    let hexToSave: string | undefined = undefined;
    if (isColor) {
      const trimmedHex = newHexColor.trim();
      if (!HEX_COLOR_REGEX.test(trimmedHex)) {
        message.error('Mã màu phải có định dạng mã HEX #RRGGBB (ví dụ: #8a857e)!');
        return;
      }
      hexToSave = trimmedHex.toUpperCase();
    }

    try {
      setAdding(true);
      await adminCatalogService.createItem(category.id, {
        value: trimmedVal,
        hexColor: hexToSave,
        sortOrder: items.length + 1,
      });
      message.success(`Đã thêm "${trimmedVal}" vào nhóm ${category.label}`);
      setNewValue('');
      if (isColor) setNewHexColor('#8a857e');
      onRefresh();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Thêm giá trị thất bại';
      message.error(errMsg);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (item: OptionItemDTO) => {
    try {
      setDeletingId(item.id);
      await adminCatalogService.deleteItem(item.id);
      message.success(`Đã xóa giá trị "${item.value}"`);
      onRefresh();
    } catch (err: unknown) {
      // ❌ CẤM cho phép xóa Thuộc tính đang có sản phẩm liên kết (hiển thị modal cảnh báo ràng buộc khóa ngoại)
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Không thể xóa thuộc tính đang có sản phẩm liên kết';

      // Open Foreign Key Constraint warning modal and load linked phones
      setWarningItem(item);
      setWarningErrorMsg(errorMsg);
      setWarningModalOpen(true);
      loadUsage(item.id);
    } finally {
      setDeletingId(null);
    }
  };

  const loadUsage = async (itemId: number) => {
    try {
      setUsageLoading(true);
      const res = await adminCatalogService.getItemUsage(itemId, { page: '0', size: '10' });
      setUsagePhones(res.content || []);
    } catch {
      setUsagePhones([]);
    } finally {
      setUsageLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Values List (Tags) */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Các giá trị hiện có ({items.length})
          </span>
          {category.maxItems ? (
            <span className="text-xs text-gray-400">
              Tối đa {category.maxItems} giá trị cho sản phẩm
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="py-6 text-center">
            <Spin size="small" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-4 text-center text-xs text-gray-400">
            Chưa có giá trị nào. Hãy thêm giá trị mới ở bên dưới.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Tag
                key={item.id}
                className="!inline-flex !items-center !gap-1.5 !rounded-lg !border !border-gray-200 !bg-white !px-3 !py-1.5 !text-sm !font-medium !text-gray-700 shadow-xs"
              >
                {/* Color preview circle if COLOR type */}
                {isColor && item.hexColor ? (
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full border border-black/15 shadow-xs"
                    style={{ backgroundColor: item.hexColor }}
                    title={item.hexColor}
                  />
                ) : null}

                <span>{item.value}</span>

                {isColor && item.hexColor ? (
                  <span className="font-mono text-[11px] text-gray-400">
                    ({item.hexColor})
                  </span>
                ) : null}

                <Popconfirm
                  title={`Xóa "${item.value}"?`}
                  description="Nếu thuộc tính đang được gắn với sản phẩm, hệ thống sẽ cảnh báo khóa ngoại."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDeleteItem(item)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deletingId === item.id}
                    className="!ml-1 !h-5 !w-5 !min-w-0 !p-0 text-gray-400 hover:text-red-500"
                  />
                </Popconfirm>
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Tag / Attribute Value Input */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          {isColor ? (
            <BgColorsOutlined className="text-primary-600" />
          ) : (
            <PlusOutlined className="text-primary-600" />
          )}
          <span className="text-sm font-semibold text-gray-800">
            {isColor ? 'Thêm màu sắc mới' : `Thêm giá trị cho ${category.label}`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Text value input */}
          <div className="min-w-[200px] flex-1">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddValue();
                }
              }}
              placeholder={
                isColor
                  ? 'Tên màu sắc (VD: Titan Tự Nhiên, Titan Đen...)'
                  : `Nhập giá trị (VD: ${
                      category.type === 'RAM'
                        ? '8GB, 12GB, 16GB'
                        : category.type === 'STORAGE'
                        ? '128GB, 256GB, 512GB, 1TB'
                        : 'Snapdragon 8 Gen 3, A17 Pro...'
                    })`
              }
              className="!rounded-lg"
              disabled={adding}
            />
          </div>

          {/* Color Picker & HEX input if category is COLOR */}
          {isColor ? (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/70 p-1.5">
              <ColorPicker
                value={newHexColor}
                onChange={(color) => {
                  const hex = color.toHexString();
                  setNewHexColor(hex);
                }}
                showText
                format="hex"
              />
              <Input
                value={newHexColor}
                onChange={(e) => setNewHexColor(e.target.value)}
                placeholder="#8a857e"
                maxLength={7}
                className="!w-24 !font-mono !text-xs !rounded-md"
                disabled={adding}
              />
              {/* Preview swatch */}
              <div
                className="h-6 w-6 rounded-md border border-gray-300 shadow-inner"
                style={{
                  backgroundColor: HEX_COLOR_REGEX.test(newHexColor)
                    ? newHexColor
                    : '#FFFFFF',
                }}
                title={`Mã màu: ${newHexColor}`}
              />
            </div>
          ) : null}

          {/* Add button */}
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleAddValue}
            loading={adding}
            className="!rounded-lg !bg-primary-600 hover:!bg-primary-700"
          >
            {isColor ? 'Thêm màu' : 'Thêm giá trị'}
          </Button>
        </div>

        {isColor && (
          <p className="mt-2 text-xs text-gray-500">
            * Định dạng mã HEX chuẩn: <span className="font-mono font-semibold text-gray-700">#RRGGBB</span> (Ví dụ: <span className="font-mono text-primary-600">#8a857e</span>, <span className="font-mono text-primary-600">#000000</span>).
          </p>
        )}
      </div>

      {/* Modal Cảnh báo Ràng Buộc Khóa Ngoại khi xóa thuộc tính đang có sản phẩm liên kết */}
      <Modal
        open={warningModalOpen}
        onCancel={() => setWarningModalOpen(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => setWarningModalOpen(false)}
            className="!rounded-lg !bg-amber-600 hover:!bg-amber-700"
          >
            Đã hiểu
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2 text-base font-bold text-amber-600">
            <ExclamationCircleOutlined className="text-lg" />
            <span>Cảnh Báo Ràng Buộc Khóa Ngoại</span>
          </div>
        }
        centered
        width={560}
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              Không thể xóa giá trị thuộc tính &ldquo;{warningItem?.value}&rdquo;!
            </p>
            <p className="mt-1 text-xs text-amber-800">
              {warningErrorMsg ||
                'Giá trị thuộc tính này hiện đang được liên kết với một hoặc nhiều mẫu điện thoại trong hệ thống. Quy tắc ràng buộc toàn vẹn dữ liệu nghiêm cấm việc xóa bỏ.'}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-700 block mb-2">
              Các sản phẩm đang sử dụng thuộc tính này:
            </span>
            {usageLoading ? (
              <div className="py-6 text-center">
                <Spin size="small" />
              </div>
            ) : usagePhones.length > 0 ? (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200">
                <Table
                  dataSource={usagePhones}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Ảnh',
                      dataIndex: 'mainImageUrl',
                      width: 50,
                      render: (img) =>
                        img ? (
                          <img
                            src={img}
                            alt="phone"
                            className="h-8 w-8 rounded object-cover border"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                            N/A
                          </div>
                        ),
                    },
                    {
                      title: 'Tên điện thoại',
                      dataIndex: 'name',
                      render: (name, record) => (
                        <div>
                          <span className="font-medium text-gray-800 text-xs block">
                            {name}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Hãng: {record.brandName || 'N/A'}
                          </span>
                        </div>
                      ),
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      width: 90,
                      render: (st) => (
                        <Badge
                          status={st === 'ACTIVE' ? 'success' : 'default'}
                          text={st === 'ACTIVE' ? 'Kinh doanh' : 'Ẩn'}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Thuộc tính được tham chiếu trong lịch sử cấu hình máy. Vui lòng kiểm tra lại trước khi thực hiện thay đổi.
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 italic">
            💡 Gợi ý: Nếu không muốn hiển thị thuộc tính này trong việc tạo máy mới, bạn có thể chỉnh sửa lại giá trị hoặc gỡ thuộc tính này khỏi các sản phẩm liên quan.
          </p>
        </div>
      </Modal>
    </div>
  );
}

