import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { Input, Tag, Button, Modal } from 'antd';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin,
  Search,
  Check,
  Sparkles,
  Plus,
  CheckCircle2,
  Home,
  Building2,
  Heart,
  HelpCircle,
  User,
  Phone,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateShipping } from '@/store/slices/checkoutSlice';
import { userService, formatFullAddress } from '@/services';
import type { LocationCoords } from './CheckoutDeliveryMap';
import type { AddressItem, AddressRequest, AddressLabel } from '@/types/api';
import {
  searchAddressSuggestions,
  reverseGeocode,
  geocodeInitialAddress,
  searchLocalDictionary,
  isValidCoordinate,
  type AddressSuggestion,
} from './checkoutGeocodingService';

const CheckoutDeliveryMap = lazy(() => import('./CheckoutDeliveryMap'));
const AddressModal = lazy(() => import('@/components/account/AddressModal'));
const AddressSelectModal = lazy(() => import('./AddressSelectModal'));

const schema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  phone: z.string().regex(/^0\d{9}$/, 'SĐT không hợp lệ (10 số, bắt đầu 0)'),
  address: z.string().min(5, 'Địa chỉ tối thiểu 5 ký tự'),
});

type FormData = z.infer<typeof schema>;

const LABEL_BADGES: Record<AddressLabel, { text: string; color: string; icon: typeof Home }> = {
  HOME: { text: 'Nhà riêng', color: 'blue', icon: Home },
  OFFICE: { text: 'Văn phòng', color: 'purple', icon: Building2 },
  FAMILY: { text: 'Người thân', color: 'orange', icon: Heart },
  OTHER: { text: 'Khác', color: 'default', icon: HelpCircle },
};

export default function ShippingForm() {
  const dispatch = useAppDispatch();
  const shipping = useAppSelector((s) => s.checkout.shipping);
  const authUser = useAppSelector((s) => s.auth.user);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const userEmail = authUser?.email || '';

  // Quản lý danh sách địa chỉ từ Sổ địa chỉ
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | number | 'custom' | null>('custom');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddressSelectorModalOpen, setIsAddressSelectorModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Trạng thái tìm kiếm và bản đồ
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [selectedLocation, setSelectedLocation] = useState<LocationCoords | null>(null);
  const [pinnedAddressSuggestion, setPinnedAddressSuggestion] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const selectedAddressIdRef = useRef<string | number | 'custom' | null>(null);

  useEffect(() => {
    selectedAddressIdRef.current = selectedAddressId;
  }, [selectedAddressId]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    setValue,
    control,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: shipping.fullName || '',
      phone: shipping.phone || '',
      address: shipping.address || '',
    },
    mode: 'onBlur',
  });

  const watchedFullName = useWatch({ control, name: 'fullName' }) ?? '';
  const watchedPhone = useWatch({ control, name: 'phone' }) ?? '';
  const watchedAddress = useWatch({ control, name: 'address' }) ?? '';

  // Re-seed the form from persisted Redux shipping
  useEffect(() => {
    setValue('fullName', shipping.fullName || '');
    setValue('phone', shipping.phone || '');
    setValue('address', shipping.address || '');
  }, [shipping.fullName, shipping.phone, shipping.address, setValue]);

  // Hàm áp dụng một địa chỉ đã lưu vào form & Redux
  const applyAddressSelection = useCallback(
    (addr: AddressItem) => {
      const targetId = addr.id;
      setSelectedAddressId(targetId);
      selectedAddressIdRef.current = targetId;
      const fullAddr = formatFullAddress(addr);

      setValue('fullName', addr.receiverName, { shouldValidate: true });
      setValue('phone', addr.receiverPhone, { shouldValidate: true });
      setValue('address', fullAddr, { shouldValidate: true });

      const hasCoords = isValidCoordinate(addr.latitude, addr.longitude);

      dispatch(
        updateShipping({
          fullName: addr.receiverName,
          phone: addr.receiverPhone,
          address: fullAddr,
          province: addr.province,
          district: addr.district || '',
          ward: addr.ward || '',
          latitude: hasCoords ? addr.latitude : undefined,
          longitude: hasCoords ? addr.longitude : undefined,
        })
      );

      // Luôn xóa gợi ý ghim cũ từ địa chỉ trước đó
      setPinnedAddressSuggestion(null);

      // Cập nhật vị trí ghim bản đồ nếu có tọa độ lưu sẵn
      if (hasCoords) {
        setSelectedLocation({
          lat: addr.latitude!,
          lng: addr.longitude!,
          displayName: fullAddr,
        });
      } else {
        // Tạm thời xóa vị trí ghim cũ để tránh hiển thị sai vị trí của địa chỉ trước đó
        setSelectedLocation(null);

        // Geocode tự động đa tầng từ chuỗi địa chỉ và components
        geocodeInitialAddress(fullAddr, {
          streetAddress: addr.streetAddress,
          ward: addr.ward,
          district: addr.district,
          province: addr.province,
        }).then((result) => {
          // Chỉ áp dụng nếu người dùng vẫn đang chọn đúng địa chỉ này
          if (selectedAddressIdRef.current === targetId) {
            if (result && isValidCoordinate(result.lat, result.lng)) {
              setSelectedLocation({
                lat: result.lat,
                lng: result.lng,
                displayName: result.displayName,
              });
              dispatch(
                updateShipping({
                  latitude: result.lat,
                  longitude: result.lng,
                })
              );
            } else {
              // Fallback nếu không tìm thấy qua online geocoding: dùng từ điển theo tỉnh/thành
              const fallback = searchLocalDictionary(addr.province || 'Hồ Chí Minh', 1);
              if (fallback.length > 0 && isValidCoordinate(fallback[0].lat, fallback[0].lng)) {
                setSelectedLocation({
                  lat: fallback[0].lat,
                  lng: fallback[0].lng,
                  displayName: fallback[0].place_name,
                });
                dispatch(
                  updateShipping({
                    latitude: fallback[0].lat,
                    longitude: fallback[0].lng,
                  })
                );
              }
            }
          }
        });
      }
    },
    [setValue, dispatch]
  );

  // Load danh sách địa chỉ từ Sổ địa chỉ khi mount hoặc khi tài khoản thay đổi
  useEffect(() => {
    if (userEmail) {
      dispatch(updateShipping({ email: userEmail }));
    }

    let isMounted = true;

    if (isAuthenticated) {
      userService
        .getAddresses()
        .then((addresses) => {
          if (!isMounted) return;
          setSavedAddresses(addresses);

          if (addresses.length > 0) {
            const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
            if (!shipping.address && !shipping.fullName) {
              applyAddressSelection(defaultAddr);
            } else {
              const matched = addresses.find(
                (a) =>
                  formatFullAddress(a) === shipping.address &&
                  a.receiverPhone === shipping.phone
              );
              if (matched) {
                setSelectedAddressId(matched.id);
                if (
                  typeof matched.latitude === 'number' &&
                  typeof matched.longitude === 'number' &&
                  Number.isFinite(matched.latitude) &&
                  Number.isFinite(matched.longitude)
                ) {
                  setSelectedLocation({
                    lat: matched.latitude,
                    lng: matched.longitude,
                    displayName: formatFullAddress(matched),
                  });
                }
              } else {
                setSelectedAddressId('custom');
              }
            }
          } else {
            setSelectedAddressId('custom');
            if (authUser && !shipping.fullName) {
              setValue('fullName', authUser.fullName);
              setValue('phone', authUser.phone || '');
              setValue('address', authUser.address || '');
              dispatch(
                updateShipping({
                  fullName: authUser.fullName,
                  phone: authUser.phone || '',
                  address: authUser.address || '',
                })
              );
            }
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setSelectedAddressId('custom');
          // Fallback sang thông tin authUser khi API địa chỉ lỗi và form chưa có dữ liệu
          if (authUser && !shipping.fullName) {
            setValue('fullName', authUser.fullName);
            setValue('phone', authUser.phone || '');
            setValue('address', authUser.address || '');
            dispatch(
              updateShipping({
                fullName: authUser.fullName,
                phone: authUser.phone || '',
                address: authUser.address || '',
              })
            );
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [userEmail, isAuthenticated, authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chọn chế độ "Nhập địa chỉ khác"
  const handleSelectCustomAddress = () => {
    setSelectedAddressId('custom');
    setPinnedAddressSuggestion(null);
  };

  // Xử lý khi thêm địa chỉ mới thành công từ Modal tại Checkout
  const handleCreateNewAddress = async (data: AddressRequest) => {
    try {
      setIsSavingAddress(true);
      const newAddr = await userService.createAddress(data);
      const addresses = await userService.getAddresses();
      setSavedAddresses(addresses);
      applyAddressSelection(newAddr);
      setIsAddressModalOpen(false);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Thử định vị vị trí ghim ban đầu nếu đã có địa chỉ sẵn và chưa có coordinates
  useEffect(() => {
    if (shipping.address && !selectedLocation) {
      geocodeInitialAddress(shipping.address).then((result) => {
        if (result) {
          setSelectedLocation({
            lat: result.lat,
            lng: result.lng,
            displayName: result.displayName,
          });
        }
      });
    }
  }, [shipping.address, selectedLocation]);

  // Đóng danh sách gợi ý khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setFocusedSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Xử lý tìm kiếm địa chỉ với debounce và hủy request cũ
  // Tách biệt việc gõ từ khóa tìm kiếm (như '97') khỏi việc kích hoạt lỗi validation
  const searchAddress = (query: string) => {
    setValue('address', query, { shouldValidate: false });
    // Khi người dùng tự gõ/chỉnh sửa chuỗi địa chỉ, reset tọa độ cũ không còn phù hợp
    dispatch(
      updateShipping({
        address: query,
        latitude: undefined,
        longitude: undefined,
      })
    );
    setSelectedLocation(null);
    setPinnedAddressSuggestion(null);
    setFocusedSuggestionIndex(-1);
    if (selectedAddressId !== 'custom') {
      setSelectedAddressId('custom');
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingSuggestions(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    debounceRef.current = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const results = await searchAddressSuggestions(
          query,
          controller.signal,
          selectedLocation ?? undefined
        );
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 350);
  };

  // Chọn một gợi ý từ danh sách autocomplete
  const selectAddress = (s: AddressSuggestion) => {
    setValue('address', s.place_name, { shouldValidate: true });
    const hasCoords = isValidCoordinate(s.lat, s.lng);
    dispatch(
      updateShipping({
        address: s.place_name,
        province: s.components?.province,
        district: s.components?.district,
        ward: s.components?.ward,
        latitude: hasCoords ? s.lat : undefined,
        longitude: hasCoords ? s.lng : undefined,
      })
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
    setPinnedAddressSuggestion(null);
    setSelectedAddressId('custom');
    if (hasCoords) {
      setSelectedLocation({
        lat: s.lat,
        lng: s.lng,
        displayName: s.place_name,
      });
      setIsMapExpanded(true);
    }
  };

  // Điều hướng bằng bàn phím (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (focusedSuggestionIndex >= 0 && suggestions[focusedSuggestionIndex]) {
        e.preventDefault();
        selectAddress(suggestions[focusedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  // Xử lý khi người dùng click vào bản đồ hoặc kéo marker
  const handleMapLocationSelect = useCallback(
    async (coords: LocationCoords) => {
      if (!isValidCoordinate(coords.lat, coords.lng)) return;
      setSelectedLocation(coords);

      // Cập nhật ngay lập tức tọa độ mới ghim vào Redux state
      dispatch(
        updateShipping({
          latitude: coords.lat,
          longitude: coords.lng,
        })
      );

      // Tra cứu địa chỉ ngược từ tọa độ đã ghim
      const addressName = await reverseGeocode(coords.lat, coords.lng);
      const currentVal = watchedAddress?.trim() || '';

      if (!addressName) return;

      if (!currentVal) {
        dispatch(updateShipping({ address: addressName }));
        setValue('address', addressName, { shouldValidate: true });
        setPinnedAddressSuggestion(null);
      } else {
        // Hiển thị gợi ý áp dụng để khách chủ động quyết định mà không làm mất số nhà tự nhập
        setPinnedAddressSuggestion(addressName);
      }
    },
    [watchedAddress, setValue, dispatch]
  );

  // Áp dụng địa chỉ từ điểm ghim vào ô nhập
  const applyPinnedAddress = () => {
    if (pinnedAddressSuggestion) {
      setValue('address', pinnedAddressSuggestion, { shouldValidate: true });
      dispatch(
        updateShipping({
          address: pinnedAddressSuggestion,
          latitude: selectedLocation?.lat,
          longitude: selectedLocation?.lng,
        })
      );
      setPinnedAddressSuggestion(null);
      setSelectedAddressId('custom');
    }
  };

  const handleFieldChange = (field: 'fullName' | 'phone', value: string) => {
    dispatch(updateShipping({ [field]: value }));
    if (selectedAddressId !== 'custom') {
      setSelectedAddressId('custom');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SỔ ĐỊA CHỈ NHẬN HÀNG */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Địa chỉ nhận hàng</h3>
            <p className="text-xs text-gray-500">
              Chọn địa chỉ từ sổ tay hoặc nhập địa chỉ giao hàng mới
            </p>
          </div>
          <Button
            type="dashed"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setIsAddressModalOpen(true)}
            className="!rounded-xl !border-green-600 !text-green-600 hover:!border-green-700 hover:!bg-green-50/50 shrink-0 font-medium"
          >
            Thêm địa chỉ mới
          </Button>
        </div>

        {/* Danh sách địa chỉ đã lưu: Gộp gọn thành 1 thẻ duy nhất hiển thị địa chỉ đang chọn */}
        {savedAddresses.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Địa chỉ giao hàng cho đơn này:
              </label>
              {savedAddresses.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setIsAddressSelectorModalOpen(true)}
                  className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>
                    Thay đổi / Chọn từ sổ địa chỉ ({savedAddresses.length} địa chỉ)
                  </span>
                </button>
              )}
            </div>

            {selectedAddressId === 'custom' ? (
              <div
                onClick={() => setIsAddressSelectorModalOpen(true)}
                className="cursor-pointer rounded-xl border border-green-600 bg-green-50/40 p-4 transition-all hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Nhập địa chỉ giao hàng khác cho đơn này
                      </p>
                      <p className="text-xs text-gray-500">
                        Bấm để đổi sang địa chỉ đã lưu trong sổ địa chỉ
                      </p>
                    </div>
                  </div>
                  <Button
                    size="small"
                    className="!rounded-lg !text-xs !border-green-600 !text-green-600 hover:!bg-green-100/50 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddressSelectorModalOpen(true);
                    }}
                  >
                    Thay đổi
                  </Button>
                </div>
              </div>
            ) : (
              (() => {
                const activeAddr =
                  savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
                if (!activeAddr) return null;
                const fullText = formatFullAddress(activeAddr);
                const labelKey = (activeAddr.label as AddressLabel) || 'HOME';
                const badge = LABEL_BADGES[labelKey] || LABEL_BADGES.HOME;
                const hasCoords =
                  typeof activeAddr.latitude === 'number' &&
                  typeof activeAddr.longitude === 'number' &&
                  Number.isFinite(activeAddr.latitude) &&
                  Number.isFinite(activeAddr.longitude);

                return (
                  <div
                    onClick={() => setIsAddressSelectorModalOpen(true)}
                    className="group cursor-pointer rounded-xl border border-green-600 bg-green-50/30 p-4 transition-all hover:border-green-700 hover:bg-green-50/60 hover:shadow-sm ring-1 ring-green-600/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 font-bold text-gray-900 text-sm">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            {activeAddr.receiverName}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {activeAddr.receiverPhone}
                          </span>

                          <Tag
                            color={badge.color}
                            className="!rounded-md !px-1.5 !py-0 !text-xs !font-medium"
                          >
                            {badge.text}
                          </Tag>

                          {activeAddr.isDefault && (
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

                        {activeAddr.note && (
                          <p className="text-xs text-gray-500 italic">
                            Ghi chú: {activeAddr.note}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {savedAddresses.length >= 2 ? (
                          <Button
                            size="small"
                            className="!rounded-lg !text-xs !font-semibold !border-green-600 !text-green-600 hover:!bg-green-100/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAddressSelectorModalOpen(true);
                            }}
                          >
                            Thay đổi
                          </Button>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                            Đang dùng
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* 2. FORM THÔNG TIN NGƯỜI NHẬN */}
        <div className="border-t border-gray-100 pt-5">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Thông tin người nhận máy
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Họ và tên người nhận <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('fullName')}
                placeholder="Nguyễn Văn A"
                value={watchedFullName}
                status={errors.fullName ? 'error' : ''}
                size="large"
                onChange={(e) => {
                  setValue('fullName', e.target.value, { shouldValidate: true });
                  handleFieldChange('fullName', e.target.value);
                }}
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Số điện thoại người nhận <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('phone')}
                placeholder="0901234567"
                value={watchedPhone}
                status={errors.phone ? 'error' : ''}
                size="large"
                onChange={(e) => {
                  setValue('phone', e.target.value, { shouldValidate: true });
                  handleFieldChange('phone', e.target.value);
                }}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Email thông báo đơn</label>
              <Input
                value={userEmail || 'Chưa có email'}
                type="email"
                size="large"
                disabled
                className="bg-gray-50 text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* 3. ĐỊA CHỈ NHẬN HÀNG VÀ BẢN ĐỒ OPENSTREETMAP */}
        <div className="mt-6 border-t border-gray-100 pt-5" ref={containerRef}>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-800">
              <MapPin className="mr-1 inline-block h-4 w-4 text-green-600" />
              Địa chỉ nhận hàng & Xác nhận vị trí <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-gray-500">Gợi ý địa chỉ thời gian thực & Ghim bản đồ</span>
          </div>

          <div className="relative z-50">
            <Input
              size="large"
              placeholder="Nhập địa chỉ, tên đường (ví dụ: 97 Man Thiện, Cầu Giấy...)"
              value={watchedAddress}
              onChange={(e) => searchAddress(e.target.value)}
              onBlur={() => {
                trigger('address');
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              prefix={<Search className="h-4 w-4 text-gray-400" />}
              status={errors.address ? 'error' : ''}
            />

            {/* Dropdown danh sách gợi ý địa chỉ */}
            {showSuggestions && (
              <div className="absolute top-full left-0 z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                {isSearchingSuggestions && (
                  <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                    <span>Đang tìm kiếm gợi ý địa chỉ...</span>
                  </div>
                )}

                {suggestions.map((s, index) => {
                  const isFocused = focusedSuggestionIndex === index;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectAddress(s)}
                      onMouseEnter={() => setFocusedSuggestionIndex(index)}
                      className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                        isFocused ? 'bg-green-50 border-l-4 border-green-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${isFocused ? 'text-green-700' : 'text-green-600'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-gray-800">{s.title || s.place_name}</div>
                        {s.subtitle && (
                          <div className="truncate text-xs text-gray-500 mt-0.5">{s.subtitle}</div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                          {s.source === 'dictionary' ? (
                            <span className="inline-flex items-center gap-0.5 text-green-600 font-medium">
                              <Sparkles className="h-3 w-3" /> Địa bàn phổ biến
                            </span>
                          ) : (
                            <span>OpenStreetMap</span>
                          )}
                          <span>•</span>
                          <span>
                            {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!isSearchingSuggestions && suggestions.length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-500 text-center">
                    Không tìm thấy gợi ý phù hợp. Bạn có thể tiếp tục nhập chi tiết và ghim trên bản đồ.
                  </div>
                )}
              </div>
            )}
          </div>

          {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}

          {/* Gợi ý cập nhật địa chỉ từ điểm đã ghim trên bản đồ */}
          {pinnedAddressSuggestion && (
            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-green-200 bg-green-50/70 px-3 py-2 text-xs text-green-900">
              <div className="flex items-center gap-1.5 truncate pr-2">
                <MapPin className="h-4 w-4 shrink-0 text-green-600" />
                <span className="truncate">
                  Vị trí ghim: <strong>{pinnedAddressSuggestion}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={applyPinnedAddress}
                className="inline-flex shrink-0 items-center gap-1 rounded bg-green-600 px-2 py-1 font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Check className="h-3 w-3" />
                Sử dụng địa chỉ này
              </button>
            </div>
          )}

          {/* Bản đồ tương tác Leaflet + OpenStreetMap (Lazy Loaded) */}
          <div className="mt-3">
            {!isMapExpanded ? (
              <button
                type="button"
                onClick={() => setIsMapExpanded(true)}
                className="w-full flex items-center justify-between rounded-xl border border-dashed border-green-300 bg-green-50/60 hover:bg-green-50 px-4 py-3 text-xs text-green-800 transition-all group shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700 group-hover:scale-105 transition-transform">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 text-sm">
                      {selectedLocation ? 'Xem bản đồ & điều chỉnh vị trí ghim' : 'Xem bản đồ OpenStreetMap & ghim vị trí nhận hàng'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedLocation
                        ? `Đã ghim tọa độ [${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}]`
                        : 'Bấm để mở bản đồ và xác định chính xác cửa vào / vị trí nhận máy'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-medium text-green-700 shadow-2xs border border-green-200 group-hover:border-green-300 text-xs">
                  Xem bản đồ
                </span>
              </button>
            ) : (
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                    Bản đồ vị trí giao hàng:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMapExpanded(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
                  >
                    Thu gọn bản đồ
                  </button>
                </div>
                <Suspense
                  fallback={
                    <div className="h-[280px] w-full rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                      <span className="text-xs font-medium text-gray-500">Đang tải bản đồ OpenStreetMap...</span>
                    </div>
                  }
                >
                  <CheckoutDeliveryMap
                    selectedLocation={selectedLocation}
                    onLocationSelect={handleMapLocationSelect}
                  />
                </Suspense>
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Bấm hoặc kéo thả ghim trên bản đồ OpenStreetMap để xác định chính xác cửa vào / vị trí nhận hàng của bạn.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DANH SÁCH CHỌN ĐỊA CHỈ TỪ SỔ ĐỊA CHỈ (Tách component AddressSelectModal) */}
      {isAddressSelectorModalOpen && (
        <Suspense fallback={null}>
          <AddressSelectModal
            open={isAddressSelectorModalOpen}
            onClose={() => setIsAddressSelectorModalOpen(false)}
            addresses={savedAddresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={(addr) => {
              applyAddressSelection(addr);
              setIsAddressSelectorModalOpen(false);
            }}
            onSelectCustomAddress={() => {
              handleSelectCustomAddress();
              setIsAddressSelectorModalOpen(false);
            }}
            onOpenAddNew={() => setIsAddressModalOpen(true)}
          />
        </Suspense>
      )}

      {/* MODAL THÊM ĐỊA CHỈ NHẬN HÀNG MỚI (Lazy Loaded) */}
      {isAddressModalOpen && (
        <Suspense fallback={null}>
          <AddressModal
            open={isAddressModalOpen}
            onCancel={() => setIsAddressModalOpen(false)}
            onSubmit={handleCreateNewAddress}
            loading={isSavingAddress}
            existingAddresses={savedAddresses}
          />
        </Suspense>
      )}
    </div>
  );
}
