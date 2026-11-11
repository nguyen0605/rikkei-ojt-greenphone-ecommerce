import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { Modal, Form, Input, Select, Checkbox, Button, Radio, Tag, message } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Sparkles, MapPin } from 'lucide-react';
import { VIETNAM_PROVINCES, findMatchingProvince, parseAddressComponents } from '@/utils/provinces';
import type { LocationCoords } from '@/components/checkout/CheckoutDeliveryMap';

const CheckoutDeliveryMap = lazy(() => import('@/components/checkout/CheckoutDeliveryMap'));
import {
  geocodeInitialAddress,
  reverseGeocode,
  searchAddressSuggestions,
  searchLocalDictionary,
  type AddressSuggestion,
} from '@/components/checkout/checkoutGeocodingService';
import type { AddressItem, AddressRequest, AddressLabel } from '@/types/api';

interface AddressModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: AddressRequest) => Promise<void>;
  initialData?: AddressItem | null;
  loading?: boolean;
}

export default function AddressModal({
  open,
  onCancel,
  onSubmit,
  initialData,
  loading = false,
}: AddressModalProps) {
  const [form] = Form.useForm<AddressRequest>();
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords | null>(null);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [isEstimateLocation, setIsEstimateLocation] = useState(false);
  const hasUserOverriddenCoords = useRef(false);

  // Trạng thái autocomplete cho ô nhập số nhà, tên đường
  const [streetSuggestions, setStreetSuggestions] = useState<AddressSuggestion[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [isSearchingStreet, setIsSearchingStreet] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const streetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetAbortRef = useRef<AbortController | null>(null);
  const streetContainerRef = useRef<HTMLDivElement>(null);

  // Tự động thử định vị vị trí khi người dùng điền hoặc bấm nút tìm vị trí
  const handleLocateFromFields = useCallback(
    async (showToast = true) => {
      const province = form.getFieldValue('province') || '';
      const district = form.getFieldValue('district') || '';
      const ward = form.getFieldValue('ward') || '';
      const streetAddress = form.getFieldValue('streetAddress') || '';

      const queryParts = [streetAddress, ward, district, province].filter(
        (p) => typeof p === 'string' && p.trim().length > 0
      );

      if (queryParts.length === 0) return;

      setIsLocatingAddress(true);
      try {
        const fullQuery = queryParts.join(', ');
        let result = await geocodeInitialAddress(fullQuery, {
          streetAddress,
          ward,
          district,
          province,
        });

        // Nếu tìm theo toàn bộ địa chỉ không ra, fallback tìm theo quận/huyện + tỉnh
        if (!result && (district || province)) {
          const areaQuery = [district, province].filter(Boolean).join(', ');
          result = await geocodeInitialAddress(areaQuery);
          if (result) {
            setIsEstimateLocation(true);
          }
        } else {
          setIsEstimateLocation(false);
        }

        if (result) {
          const coords: LocationCoords = {
            lat: result.lat,
            lng: result.lng,
            displayName: result.displayName,
          };
          setSelectedCoords(coords);
          form.setFieldsValue({
            latitude: result.lat,
            longitude: result.lng,
          });

          // Tự động kiểm tra và đồng bộ lại Tỉnh/Thành nếu phát hiện không khớp
          const detected =
            findMatchingProvince(result.displayName) ||
            (result.components?.province ? findMatchingProvince(result.components.province) : undefined);
          if (detected && form.getFieldValue('province') !== detected) {
            form.setFieldsValue({ province: detected });
          }

          // Tự động điền Quận/Huyện nếu đang trống
          if (!form.getFieldValue('district')) {
            const detectedDist = result.components?.district || parseAddressComponents(streetAddress).district;
            if (detectedDist) {
              form.setFieldsValue({ district: detectedDist });
            }
          }

          // Tự động điền Phường/Xã nếu đang trống
          if (!form.getFieldValue('ward')) {
            const detectedWard = result.components?.ward || parseAddressComponents(streetAddress).ward;
            if (detectedWard) {
              form.setFieldsValue({ ward: detectedWard });
            }
          }

          if (showToast) {
            message.success('Đã xác định vị trí và ghim thành công trên bản đồ!');
          }
        } else if (showToast) {
          message.warning(
            'Không tìm thấy tọa độ phù hợp. Bạn có thể bấm trực tiếp trên bản đồ để ghim vị trí.'
          );
        }
      } finally {
        setIsLocatingAddress(false);
      }
    },
    [form]
  );

  useEffect(() => {
    if (open) {
      hasUserOverriddenCoords.current = false;
      queueMicrotask(() => {
        setStreetSuggestions([]);
        setShowStreetSuggestions(false);
        setFocusedIndex(-1);
      });

      if (initialData) {
        const parsed = parseAddressComponents(initialData.streetAddress);
        const resolvedProvince =
          findMatchingProvince(initialData.province) ||
          parsed.province ||
          initialData.province ||
          'TP. Hồ Chí Minh';
        const resolvedDistrict = initialData.district || parsed.district || '';
        const resolvedWard = initialData.ward || parsed.ward || '';

        form.setFieldsValue({
          receiverName: initialData.receiverName,
          receiverPhone: initialData.receiverPhone,
          province: resolvedProvince,
          district: resolvedDistrict,
          ward: resolvedWard,
          streetAddress: initialData.streetAddress,
          label: (initialData.label as AddressLabel) || 'HOME',
          note: initialData.note || '',
          isDefault: initialData.isDefault,
          latitude: initialData.latitude,
          longitude: initialData.longitude,
        });

        const hasValidCoords =
          typeof initialData.latitude === 'number' &&
          typeof initialData.longitude === 'number' &&
          Number.isFinite(initialData.latitude) &&
          Number.isFinite(initialData.longitude);

        if (hasValidCoords) {
          queueMicrotask(() => {
            setSelectedCoords({
              lat: initialData.latitude!,
              lng: initialData.longitude!,
              displayName: initialData.streetAddress,
            });
            setIsEstimateLocation(false);
          });
        } else {
          queueMicrotask(() => {
            setSelectedCoords(null);
          });
          // Tự động định vị địa chỉ nếu chưa có tọa độ ghim sẵn
          setTimeout(() => {
            handleLocateFromFields(false);
          }, 300);
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          province: 'Hà Nội',
          label: 'HOME',
          isDefault: false,
        });
        queueMicrotask(() => {
          setSelectedCoords(null);
          setIsEstimateLocation(false);
        });
      }
    }
  }, [open, initialData, form, handleLocateFromFields]);

  // Đóng danh sách gợi ý khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (streetContainerRef.current && !streetContainerRef.current.contains(e.target as Node)) {
        setShowStreetSuggestions(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Xử lý tìm kiếm gợi ý địa chỉ cho ô streetAddress
  const handleStreetChange = (query: string) => {
    form.setFieldsValue({ streetAddress: query });
    setFocusedIndex(-1);

    if (query.trim().length < 2) {
      setStreetSuggestions([]);
      setShowStreetSuggestions(false);
      setIsSearchingStreet(false);
      return;
    }

    if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current);
    if (streetAbortRef.current) streetAbortRef.current.abort();

    streetDebounceRef.current = setTimeout(async () => {
      setIsSearchingStreet(true);
      const controller = new AbortController();
      streetAbortRef.current = controller;

      try {
        const results = await searchAddressSuggestions(
          query,
          controller.signal,
          selectedCoords ?? undefined
        );
        setStreetSuggestions(results);
        setShowStreetSuggestions(true);
      } catch {
        setStreetSuggestions([]);
      } finally {
        setIsSearchingStreet(false);
      }
    }, 350);
  };

  // Chọn một gợi ý từ danh sách autocomplete
  const handleSelectStreetSuggestion = (s: AddressSuggestion) => {
    const chosenStreet = s.components?.streetAddress || s.title || s.place_name;
    form.setFieldsValue({
      streetAddress: chosenStreet,
      latitude: s.lat,
      longitude: s.lng,
    });

    // Tự động điền Tỉnh/Thành nếu khớp
    const matchProv = findMatchingProvince(s.components?.province || s.place_name);
    if (matchProv) {
      form.setFieldsValue({ province: matchProv });
    }

    // Tự động điền Quận/Huyện nếu có
    if (s.components?.district) {
      form.setFieldsValue({ district: s.components.district });
    }

    // Tự động điền Phường/Xã nếu có
    if (s.components?.ward) {
      form.setFieldsValue({ ward: s.components.ward });
    }

    setSelectedCoords({
      lat: s.lat,
      lng: s.lng,
      displayName: s.place_name,
    });
    setIsEstimateLocation(false);
    setShowStreetSuggestions(false);
    setStreetSuggestions([]);
    setFocusedIndex(-1);
  };

  // Điều hướng bằng bàn phím trong menu autocomplete
  const handleStreetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showStreetSuggestions || streetSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < streetSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : streetSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && streetSuggestions[focusedIndex]) {
        e.preventDefault();
        handleSelectStreetSuggestion(streetSuggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowStreetSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  // Xử lý khi người dùng tương tác trực tiếp trên bản đồ (click hoặc kéo marker)
  const handleMapLocationSelect = useCallback(
    async (coords: LocationCoords) => {
      hasUserOverriddenCoords.current = true;
      setSelectedCoords(coords);
      setIsEstimateLocation(false);

      form.setFieldsValue({
        latitude: coords.lat,
        longitude: coords.lng,
      });

      // Nếu ô địa chỉ cụ thể đang trống, tra cứu địa chỉ ngược để hỗ trợ người dùng
      const currentStreet = form.getFieldValue('streetAddress');
      if (!currentStreet || !currentStreet.trim()) {
        const reverseName = await reverseGeocode(coords.lat, coords.lng);
        if (reverseName) {
          form.setFieldsValue({
            streetAddress: reverseName,
          });
        }
      }
    },
    [form]
  );

  const handleFinish = async (values: AddressRequest) => {
    let lat = selectedCoords?.lat ?? values.latitude;
    let lng = selectedCoords?.lng ?? values.longitude;

    // Nếu vẫn chưa có tọa độ ghim, tự động geocode lần cuối để validate và ghim trước khi lưu
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      const fullQuery = [values.streetAddress, values.ward, values.district, values.province]
        .filter(Boolean)
        .join(', ');
      try {
        const autoGeocode = await geocodeInitialAddress(fullQuery, {
          streetAddress: values.streetAddress,
          ward: values.ward,
          district: values.district,
          province: values.province,
        });

        if (autoGeocode) {
          lat = autoGeocode.lat;
          lng = autoGeocode.lng;
          const detected = findMatchingProvince(autoGeocode.displayName);
          if (detected && detected !== values.province) {
            values.province = detected;
          }
        } else {
          // Fallback về tọa độ từ điển theo tỉnh/thành
          const fallback = searchLocalDictionary(values.province || 'Hồ Chí Minh', 1);
          if (fallback.length > 0) {
            lat = fallback[0].lat;
            lng = fallback[0].lng;
          }
        }
      } catch {
        // ignore
      }
    }

    const parsedFallback = parseAddressComponents(values.streetAddress);
    const finalDistrict = values.district?.trim() || parsedFallback.district || '';
    const finalWard = values.ward?.trim() || parsedFallback.ward || '';

    const submitValues: AddressRequest = {
      ...values,
      receiverName: values.receiverName.trim(),
      receiverPhone: values.receiverPhone.trim(),
      province: values.province.trim(),
      district: finalDistrict,
      ward: finalWard,
      streetAddress: values.streetAddress.trim(),
      note: values.note?.trim() || '',
      label: values.label || 'HOME',
      isDefault: Boolean(values.isDefault),
      latitude: lat,
      longitude: lng,
    };

    await onSubmit(submitValues);
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
          <EnvironmentOutlined className="text-green-600" />
          <span>{initialData ? 'Chỉnh sửa địa chỉ nhận hàng' : 'Thêm địa chỉ nhận hàng mới'}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      centered
      width={680}
      className="max-w-2xl"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="pt-2"
        requiredMark="optional"
      >
        {/* Recipient Information */}
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          {/* Receiver Name */}
          <Form.Item
            name="receiverName"
            label={<span className="text-sm font-medium text-gray-700">Tên người nhận</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập tên người nhận' },
              {
                validator: (_, val) => {
                  if (!val || !val.trim()) {
                    return Promise.resolve();
                  }
                  if (val.trim().length < 2) {
                    return Promise.reject(new Error('Tên người nhận tối thiểu 2 ký tự'));
                  }
                  if (val.trim().length > 50) {
                    return Promise.reject(new Error('Tên người nhận tối đa 50 ký tự'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              size="large"
              placeholder="Nguyễn Văn A"
              className="!rounded-xl"
            />
          </Form.Item>

          {/* Receiver Phone */}
          <Form.Item
            name="receiverPhone"
            label={<span className="text-sm font-medium text-gray-700">Số điện thoại</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              {
                pattern: /^(0|\+84)\d{9}$/,
                message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng số 0 (hoặc +84)',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined className="text-gray-400" />}
              size="large"
              placeholder="0912345678"
              className="!rounded-xl"
            />
          </Form.Item>
        </div>

        {/* Administrative divisions */}
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          {/* Province / City */}
          <Form.Item
            name="province"
            label={<span className="text-sm font-medium text-gray-700">Tỉnh / Thành phố</span>}
            rules={[{ required: true, message: 'Vui lòng chọn Tỉnh/Thành' }]}
          >
            <Select
              size="large"
              showSearch
              placeholder="Chọn Tỉnh/TP"
              className="w-full !rounded-xl"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={VIETNAM_PROVINCES.map((p) => ({ value: p, label: p }))}
            />
          </Form.Item>

          {/* District */}
          <Form.Item
            name="district"
            label={<span className="text-sm font-medium text-gray-700">Quận / Huyện</span>}
            rules={[
              {
                validator: (_, val) => {
                  const street = form.getFieldValue('streetAddress') || '';
                  const parsed = parseAddressComponents(street);
                  if ((!val || !val.trim()) && !parsed.district) {
                    return Promise.reject(new Error('Vui lòng nhập Quận/Huyện'));
                  }
                  if (val && val.trim().length > 0 && val.trim().length < 2) {
                    return Promise.reject(new Error('Quận/Huyện tối thiểu 2 ký tự'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input size="large" placeholder="Quận / Huyện" className="!rounded-xl" />
          </Form.Item>

          {/* Ward */}
          <Form.Item
            name="ward"
            label={<span className="text-sm font-medium text-gray-700">Phường / Xã</span>}
            rules={[
              {
                validator: (_, val) => {
                  const street = form.getFieldValue('streetAddress') || '';
                  const parsed = parseAddressComponents(street);
                  if ((!val || !val.trim()) && !parsed.ward) {
                    return Promise.reject(new Error('Vui lòng nhập Phường/Xã'));
                  }
                  if (val && val.trim().length > 0 && val.trim().length < 2) {
                    return Promise.reject(new Error('Phường/Xã tối thiểu 2 ký tự'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input size="large" placeholder="Phường / Xã" className="!rounded-xl" />
          </Form.Item>
        </div>

        {/* Street Address with Autocomplete */}
        <div ref={streetContainerRef} className="relative z-40">
          <Form.Item
            name="streetAddress"
            label={<span className="text-sm font-medium text-gray-700">Địa chỉ cụ thể (Số nhà, tên đường)</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số nhà, tên đường' },
              {
                validator: (_, val) => {
                  if (!val || !val.trim()) {
                    return Promise.resolve();
                  }
                  if (val.trim().length < 5) {
                    return Promise.reject(new Error('Địa chỉ cụ thể tối thiểu 5 ký tự'));
                  }
                  if (val.trim().length > 255) {
                    return Promise.reject(new Error('Địa chỉ cụ thể tối đa 255 ký tự'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            validateTrigger={['onBlur']}
          >
            <Input
              prefix={<HomeOutlined className="text-gray-400" />}
              size="large"
              placeholder="Số 123 Đường Cầu Giấy, Tòa nhà Green (hoặc gõ để tìm gợi ý)"
              className="!rounded-xl"
              onChange={(e) => handleStreetChange(e.target.value)}
              onKeyDown={handleStreetKeyDown}
              onFocus={() => {
                if (streetSuggestions.length > 0) setShowStreetSuggestions(true);
              }}
            />
          </Form.Item>

          {/* Dropdown gợi ý địa chỉ thời gian thực */}
          {showStreetSuggestions && (
            <div className="absolute top-[72px] left-0 z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              {isSearchingStreet && (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                  <span>Đang tìm kiếm gợi ý...</span>
                </div>
              )}

              {streetSuggestions.map((s, index) => {
                const isFocused = focusedIndex === index;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStreetSuggestion(s)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                      isFocused ? 'bg-green-50 border-l-4 border-green-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${isFocused ? 'text-green-700' : 'text-green-600'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-gray-800">{s.title || s.place_name}</div>
                      {s.subtitle && <div className="truncate text-xs text-gray-500 mt-0.5">{s.subtitle}</div>}
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        {s.source === 'dictionary' ? (
                          <span className="inline-flex items-center gap-0.5 text-green-600 font-medium">
                            <Sparkles className="h-3 w-3" /> Địa bàn phổ biến
                          </span>
                        ) : (
                          <span>OpenStreetMap</span>
                        )}
                        <span>•</span>
                        <span>{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!isSearchingStreet && streetSuggestions.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-500 text-center">
                  Không tìm thấy gợi ý. Bạn có thể tiếp tục nhập số nhà và ghim vị trí trên bản đồ.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Address Label Selector */}
        <Form.Item
          name="label"
          label={<span className="text-sm font-medium text-gray-700">Loại địa chỉ</span>}
          initialValue="HOME"
        >
          <Radio.Group buttonStyle="solid" className="w-full">
            <Radio.Button value="HOME" className="!rounded-l-xl">
              🏠 Nhà riêng
            </Radio.Button>
            <Radio.Button value="OFFICE">
              🏢 Văn phòng
            </Radio.Button>
            <Radio.Button value="FAMILY">
              👨‍👩‍👧 Người thân
            </Radio.Button>
            <Radio.Button value="OTHER" className="!rounded-r-xl">
              📍 Khác
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* Interactive Location Confirmation Map */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <EnvironmentOutlined className="text-green-600" />
              <span>Xác nhận vị trí giao hàng trên bản đồ</span>
            </div>
            <Button
              size="small"
              icon={<SearchOutlined />}
              onClick={() => handleLocateFromFields(true)}
              loading={isLocatingAddress}
              className="!rounded-lg !text-xs !border-green-600 !text-green-600 hover:!bg-green-50 self-start sm:self-auto"
            >
              Định vị từ địa chỉ đã nhập
            </Button>
          </div>

          {/* Trạng thái định vị */}
          {selectedCoords ? (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-green-50 px-2.5 py-1.5 text-xs text-green-800 border border-green-200">
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircleOutlined className="text-green-600 shrink-0" />
                <span className="truncate">
                  {isEstimateLocation ? (
                    <span>
                      Vị trí ước tính khu vực: <strong>{selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}</strong> (Kéo ghim để chỉnh số nhà chính xác)
                    </span>
                  ) : (
                    <span>
                      Tọa độ đã ghim: <strong>{selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}</strong>
                    </span>
                  )}
                </span>
              </div>
              <Tag color="success" className="!mr-0 shrink-0 font-medium">
                {isEstimateLocation ? 'Ước lượng' : 'Đã xác nhận'}
              </Tag>
            </div>
          ) : (
            <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
              <InfoCircleOutlined className="text-gray-400" />
              <span>Bấm nút định vị hoặc bấm trực tiếp trên bản đồ để ghim chính xác cửa vào</span>
            </div>
          )}

          {/* Khung bản đồ */}
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <Suspense
              fallback={
                <div className="h-[240px] w-full bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                  <span className="text-xs font-medium text-gray-500">Đang tải bản đồ...</span>
                </div>
              }
            >
              <CheckoutDeliveryMap
                selectedLocation={selectedCoords}
                onLocationSelect={handleMapLocationSelect}
                className="!h-[240px]"
              />
            </Suspense>
          </div>
        </div>

        {/* Note */}
        <Form.Item
          name="note"
          label={<span className="text-sm font-medium text-gray-700">Ghi chú giao hàng (Tùy chọn)</span>}
          rules={[{ max: 200, message: 'Ghi chú tối đa 200 ký tự' }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="Ví dụ: Gọi trước khi giao, gửi bảo vệ tòa nhà..."
            className="!rounded-xl"
            maxLength={200}
            showCount
          />
        </Form.Item>

        {/* Hidden inputs to preserve lat / lng */}
        <Form.Item name="latitude" hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item name="longitude" hidden>
          <Input type="hidden" />
        </Form.Item>

        {/* Is Default Checkbox */}
        <Form.Item name="isDefault" valuePropName="checked" className="!mb-6">
          <Checkbox className="text-sm font-medium text-gray-700">
            Đặt làm địa chỉ nhận hàng mặc định
          </Checkbox>
        </Form.Item>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button onClick={onCancel} className="!h-10 !rounded-xl !px-5" disabled={loading}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="!h-10 !rounded-xl !bg-green-600 !px-6 !font-semibold hover:!bg-green-700 shadow-sm"
          >
            {initialData ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
