import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoComplete, type AutoCompleteProps } from 'antd';
import { Search } from 'lucide-react';
import { phoneService } from '@/services';
import type { PhoneDTO } from '@/types/api';
import { ROUTES } from '@/routes/routePaths';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatVND } from '@/utils';
import { getOptimizedImageUrl } from '@/utils/image';

interface HeaderSearchProps {
  className?: string;
}

type Option = NonNullable<AutoCompleteProps['options']>[number];

export default function HeaderSearch({ className }: HeaderSearchProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(value.trim(), 300);
  const requestIdRef = useRef(0);

  // Debounce search: gọi /phones/search, lấy top 5 gợi ý
  useEffect(() => {
    const q = debouncedQuery;
    if (!q) return;

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    phoneService
      .search({ q, size: '5' })
      .then((data) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        const phones = data.content || [];
        const resultOptions: Option[] = phones.map((phone: PhoneDTO) => ({
          value: String(phone.id),
          label: (
            <div className="flex items-center gap-3 py-1">
              {phone.mainImageUrl && (
                <img
                  src={getOptimizedImageUrl(phone.mainImageUrl, { width: 48 })}
                  alt={phone.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">
                  {phone.name}
                </div>
                <div className="text-xs text-gray-500">
                  {phone.lowestPrice != null ? formatVND(phone.lowestPrice) : 'Liên hệ'}
                </div>
              </div>
            </div>
          ),
        }));

        // Thêm option "Xem tất cả kết quả" dẫn tới trang sản phẩm lọc theo q
        resultOptions.push({
          value: `__all__${q}`,
          label: (
            <div className="flex items-center justify-center gap-1 py-1 text-sm font-medium text-green-600">
              <Search className="h-4 w-4" />
              Xem tất cả kết quả cho "{q}"
            </div>
          ),
        });

        setOptions(resultOptions);
        setOpen(true);
      })
      .catch(() => {
        // Bỏ qua lỗi mạng — dropdown sẽ tự đóng
        if (requestId === requestIdRef.current) setOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = (selected: string) => {
    // Option "__all__..." → chuyển tới trang sản phẩm lọc theo q
    if (selected.startsWith('__all__')) {
      const q = selected.slice('__all__'.length);
      navigate(`${ROUTES.PRODUCTS}?q=${encodeURIComponent(q)}`);
    } else {
      // Option là id điện thoại → chuyển tới chi tiết
      navigate(ROUTES.PRODUCT_DETAIL(selected));
    }
    setValue('');
    setOptions([]);
    setOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Skip IME composition (gõ tiếng Việt)
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();

    const q = value.trim();
    if (!q) return;

    // Enter: nếu chưa có kết quả thì gọi search và mở dropdown;
    // nếu đã có thì giữ dropdown mở cho người dùng chọn.
    if (options.length === 0) {
      // Kích hoạt search ngay (debouncedQuery có thể chưa kịp update)
      phoneService
        .search({ q, size: '5' })
        .then((data) => {
          const phones = data.content || [];
          const resultOptions: Option[] = phones.map((phone: PhoneDTO) => ({
            value: String(phone.id),
            label: (
              <div className="flex items-center gap-3 py-1">
                {phone.mainImageUrl && (
                  <img
                    src={getOptimizedImageUrl(phone.mainImageUrl, { width: 48 })}
                    alt={phone.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {phone.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {phone.lowestPrice != null ? formatVND(phone.lowestPrice) : 'Liên hệ'}
                  </div>
                </div>
              </div>
            ),
          }));
          resultOptions.push({
            value: `__all__${q}`,
            label: (
              <div className="flex items-center justify-center gap-1 py-1 text-sm font-medium text-green-600">
                <Search className="h-4 w-4" />
                Xem tất cả kết quả cho "{q}"
              </div>
            ),
          });
          setOptions(resultOptions);
          setOpen(true);
        })
        .catch(() => {
          setOptions([]);
        });
    } else {
      // Đã có kết quả → chỉ cần mở dropdown
      setOpen(true);
    }
  };

  return (
    <AutoComplete
      className={className}
      style={{ width: '100%' }}
      value={value}
      options={options}
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setOptions([]);
      }}
      onChange={setValue}
      onSelect={handleSelect}
      onInputKeyDown={handleInputKeyDown}
      popupMatchSelectWidth={false}
      popupClassName="!w-80 sm:!w-96"
      size="large"
      allowClear
      placeholder="Tìm kiếm điện thoại..."
      prefix={<Search className="h-4 w-4 text-gray-400" />}
    />
  );
}