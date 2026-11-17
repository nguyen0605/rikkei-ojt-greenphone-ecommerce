import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { Modal, Form, Input, Select, AutoComplete, Checkbox, Button, Radio, Tag, message, Switch } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Sparkles, MapPin, Home, Building2, Users, Navigation, ArrowUp } from 'lucide-react';
import { VIETNAM_PROVINCES, findMatchingProvince, parseAddressComponents } from '@/utils/provinces';
import {
  getDistrictsForProvince,
  getWardsForDistrict,
  isDistrictInProvince,
  findDistrictByWard,
  getProvinceFromCoords,
  normalizeAdminName,
} from '@/utils/vietnamAdministrative';
import type { LocationCoords } from '@/components/checkout/CheckoutDeliveryMap';

const CheckoutDeliveryMap = lazy(() => import('@/components/checkout/CheckoutDeliveryMap'));
import {
  geocodeInitialAddress,
  reverseGeocode,
  reverseGeocodeDetails,
  searchAddressSuggestions,
  isValidCoordinate,
  type AddressSuggestion,
} from '@/components/checkout/checkoutGeocodingService';
import type { AddressItem, AddressRequest, AddressLabel } from '@/types/api';
import { userService, checkDuplicateAddress } from '@/services/userService';

interface AddressModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: AddressRequest) => Promise<void>;
  initialData?: AddressItem | null;
  loading?: boolean;
  existingAddresses?: AddressItem[];
}

export default function AddressModal({
  open,
  onCancel,
  onSubmit,
  initialData,
  loading = false,
  existingAddresses,
}: AddressModalProps) {
  const [form] = Form.useForm<AddressRequest>();
  const watchedProvince = Form.useWatch('province', form);
  const watchedDistrict = Form.useWatch('district', form);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [mapValidationError, setMapValidationError] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords | null>(null);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [isLocatingCurrentGps, setIsLocatingCurrentGps] = useState(false);
  const [isEstimateLocation, setIsEstimateLocation] = useState(false);
  const [showLocationPointer, setShowLocationPointer] = useState(false);
  const [isLocationSwitchOn, setIsLocationSwitchOn] = useState(false);
  const hasUserOverriddenCoords = useRef(false);

  // Danh sách gợi ý Quận/Huyện tương ứng với Tỉnh/Thành phố đang chọn
  const districtOptions = useMemo(() => {
    const list = getDistrictsForProvince(watchedProvince);
    return list.map((d) => ({ value: d, label: d }));
  }, [watchedProvince]);

  // Danh sách gợi ý Phường/Xã tương ứng với Quận/Huyện đang chọn
  const wardOptions = useMemo(() => {
    const list = getWardsForDistrict(watchedProvince, watchedDistrict);
    return list.map((w) => ({ value: w, label: w }));
  }, [watchedProvince, watchedDistrict]);

  // Khi người dùng đổi Tỉnh/Thành, nếu Quận/Huyện cũ không thuộc tỉnh mới thì reset
  const prevProvinceRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevProvinceRef.current && prevProvinceRef.current !== watchedProvince) {
      const currentDist = form.getFieldValue('district');
      if (currentDist && !isDistrictInProvince(currentDist, watchedProvince)) {
        form.setFieldsValue({ district: '', ward: '' });
      }
      if (!hasUserOverriddenCoords.current) {
        setSelectedCoords(null);
        form.setFieldsValue({ latitude: undefined, longitude: undefined });
      }
    }
    prevProvinceRef.current = watchedProvince;
  }, [watchedProvince, form]);

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

      const trimmedStreet = streetAddress.trim();
      // YÊU CẦU: Nếu người dùng chưa nhập địa chỉ cụ thể mà bấm định vị thì phải báo là chưa nhập
      if (!trimmedStreet) {
        const emptyMsg = 'Vui lòng nhập số nhà, tên đường hoặc địa chỉ cụ thể trước khi định vị.';
        setMapValidationError(emptyMsg);
        setSelectedCoords(null);
        if (showToast) {
          message.warning(emptyMsg);
        }
        return;
      }

      // Kiểm tra tính nhất quán giữa Quận/Huyện và Tỉnh/Thành
      if (
        district &&
        province &&
        getDistrictsForProvince(province).length > 0 &&
        !isDistrictInProvince(district, province)
      ) {
        const errorDistMsg = `Quận/Huyện "${district}" không thuộc ${province}. Vui lòng chọn quận/huyện hợp lệ.`;
        setMapValidationError(errorDistMsg);
        setSelectedCoords(null);
        hasUserOverriddenCoords.current = false;
        form.setFieldsValue({
          latitude: undefined,
          longitude: undefined,
        });
        if (showToast) {
          message.error(errorDistMsg);
        }
        return;
      }

      const queryParts = [trimmedStreet, ward, district, province].filter(
        (p) => typeof p === 'string' && p.trim().length > 0
      );

      if (queryParts.length === 0) return;

      setIsLocatingAddress(true);
      setMapValidationError(null);
      try {
        const fullQuery = queryParts.join(', ');
        const result = await geocodeInitialAddress(fullQuery, {
          streetAddress: trimmedStreet,
          ward,
          district,
          province,
        });

        // QUY TẮC BẮT BUỘC: Nếu địa chỉ nhập vào không có trên bản đồ hoặc không thuộc khu vực đã chọn:
        // - Tuyệt đối KHÔNG trỏ marker bừa bãi hay fallback về trung tâm quận/tỉnh.
        // - Xóa ghim và hiển thị thông báo lỗi để người dùng kiểm tra hoặc ghim tay.
        if (result && isValidCoordinate(result.lat, result.lng)) {
          // Xác thực lần nữa: kết quả không được nằm ở tỉnh khác
          const detected =
            findMatchingProvince(result.displayName) ||
            (result.components?.province ? findMatchingProvince(result.components.province) : undefined);
          if (detected && province && detected !== findMatchingProvince(province)) {
            setSelectedCoords(null);
            setIsEstimateLocation(false);
            hasUserOverriddenCoords.current = false;
            form.setFieldsValue({
              latitude: undefined,
              longitude: undefined,
            });
            const errorMsg =
              'Địa chỉ không tồn tại trên bản đồ hoặc không thuộc khu vực đã chọn. Vui lòng kiểm tra lại!';
            setMapValidationError(errorMsg);
            if (showToast) {
              message.error(errorMsg);
            }
            return;
          }

          const coords: LocationCoords = {
            lat: result.lat,
            lng: result.lng,
            displayName: result.displayName,
          };
          setSelectedCoords(coords);
          setIsEstimateLocation(false);
          setMapValidationError(null);
          form.setFieldsValue({
            latitude: result.lat,
            longitude: result.lng,
          });

          // Tự động kiểm tra và đồng bộ lại Tỉnh/Thành nếu phát hiện không khớp
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
        } else {
          // Địa chỉ không có trên bản đồ -> Không trỏ tới chỗ đó, con trỏ ở yên
          setSelectedCoords(null);
          setIsEstimateLocation(false);
          hasUserOverriddenCoords.current = false;
          form.setFieldsValue({
            latitude: undefined,
            longitude: undefined,
          });
          const errorMsg =
            'Địa chỉ không tồn tại trên bản đồ hoặc không thuộc khu vực đã chọn. Vui lòng kiểm tra lại số nhà, tên đường hoặc ghim vị trí trên bản đồ.';
          setMapValidationError(errorMsg);
          if (showToast) {
            message.error(errorMsg);
          }
        }
      } finally {
        setIsLocatingAddress(false);
      }
    },
    [form]
  );

  useEffect(() => {
    if (open) {
      setDuplicateError(null);
      setMapValidationError(null);
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
    setMapValidationError(null);

    // Khi người dùng gõ / sửa địa chỉ cụ thể, reset ghim cũ để tránh trỏ sai vị trí
    hasUserOverriddenCoords.current = false;
    setSelectedCoords(null);
    form.setFieldsValue({
      latitude: undefined,
      longitude: undefined,
    });

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
    hasUserOverriddenCoords.current = true;
    setIsEstimateLocation(false);
    setMapValidationError(null);
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

  // Xử lý khi người dùng bấm nút lấy vị trí GPS hiện tại (cạnh mục Khác)
  const handleUseCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      message.error('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    // Kiểm tra nhanh quyền bằng Permissions API nếu trình duyệt hỗ trợ
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const permStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permStatus.state === 'denied') {
          setIsLocationSwitchOn(false);
          setShowLocationPointer(true);
          return;
        }
      } catch {
        // Permissions API query not supported or failed, fallback to standard getCurrentPosition
      }
    }

    setIsLocatingCurrentGps(true);
    setMapValidationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocationSwitchOn(true);
        setShowLocationPointer(false);
        try {
          const { latitude, longitude } = pos.coords;
          if (!isValidCoordinate(latitude, longitude)) {
            message.error('Tọa độ vị trí hiện tại không hợp lệ.');
            return;
          }

          // Phân tích chi tiết địa chỉ từ tọa độ GPS
          const details = await reverseGeocodeDetails(latitude, longitude);
          const fullPlaceName = details?.place_name || `Vị trí (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

          setSelectedCoords({
            lat: latitude,
            lng: longitude,
            displayName: fullPlaceName,
          });
          setIsEstimateLocation(false);
          setMapValidationError(null);
          hasUserOverriddenCoords.current = true;

          // Suy đoán và đồng bộ đầy đủ các trường Tỉnh/Thành, Quận/Huyện, Phường/Xã, Địa chỉ cụ thể
          const resolvedProv =
            findMatchingProvince(details?.components?.province) ||
            findMatchingProvince(fullPlaceName) ||
            getProvinceFromCoords(latitude, longitude) ||
            'TP. Hồ Chí Minh';

          let resolvedWard = details?.components?.ward || parseAddressComponents(fullPlaceName).ward || '';
          let resolvedDist = details?.components?.district || parseAddressComponents(fullPlaceName).district || '';

          if (!resolvedDist && resolvedProv && resolvedWard) {
            resolvedDist = findDistrictByWard(resolvedProv, resolvedWard) || '';
          }

          // Nếu chưa có phường nhưng có quận, lấy phường đầu tiên của quận để form không bị trống
          if (!resolvedWard && resolvedProv && resolvedDist) {
            const wardsInDist = getWardsForDistrict(resolvedProv, resolvedDist);
            if (wardsInDist.length > 0) {
              resolvedWard = wardsInDist[0];
            }
          }

          let resolvedStreet =
            details?.components?.streetAddress ||
            (details?.title && !details.title.startsWith('Vị trí') ? details.title : '') ||
            (fullPlaceName && !fullPlaceName.startsWith('Vị trí') ? fullPlaceName.split(',')[0] : '') ||
            `Khu vực tọa độ (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

          // Gán đồng thời toàn bộ giá trị để cập nhật form tức thì, không bị thiếu sót trường nào
          prevProvinceRef.current = resolvedProv;
          form.setFieldsValue({
            province: resolvedProv,
            district: resolvedDist,
            ward: resolvedWard,
            streetAddress: resolvedStreet,
            latitude,
            longitude,
          });

          message.success('Đã xác định vị trí hiện tại và tự động điền đầy đủ địa chỉ!');
        } catch {
          message.warning('Đã xác định tọa độ nhưng không thể phân tích địa chỉ chi tiết.');
        } finally {
          setIsLocatingCurrentGps(false);
        }
      },
      (err) => {
        setIsLocatingCurrentGps(false);
        if (err.code === 1 || err.code === (window.GeolocationPositionError?.PERMISSION_DENIED ?? 1)) {
          setIsLocationSwitchOn(false);
          setShowLocationPointer(true);
        } else if (err.code === 3 || err.code === (window.GeolocationPositionError?.TIMEOUT ?? 3)) {
          message.warning('Hết thời gian chờ định vị GPS. Vui lòng thử lại.');
        } else {
          message.warning('Không thể xác định vị trí hiện tại của thiết bị.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [form]);

  // Gạt công tắc bật quyền vị trí từ hộp thoại hướng dẫn
  const handleToggleLocationSwitch = (checked: boolean) => {
    if (checked) {
      handleUseCurrentLocation();
    } else {
      setIsLocationSwitchOn(false);
    }
  };

  // Tự động phát hiện khi người dùng vừa gạt bật quyền vị trí trên trình duyệt
  // Hoạt động tức thời (0.5s polling + window focus) mà KHÔNG CẦN TẢI LẠI TRANG FRONTEND
  useEffect(() => {
    if (!showLocationPointer) return;
    let isDisposed = false;

    const checkGranted = async () => {
      if (typeof navigator === 'undefined' || !('permissions' in navigator)) return;
      try {
        const permStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permStatus.state === 'granted' && !isDisposed) {
          setIsLocationSwitchOn(true);
          setShowLocationPointer(false);
          handleUseCurrentLocation();
        }
      } catch {
        // ignore
      }
    };

    const onWindowFocus = () => {
      checkGranted();
    };

    window.addEventListener('focus', onWindowFocus);
    const intervalId = setInterval(checkGranted, 500);

    return () => {
      isDisposed = true;
      window.removeEventListener('focus', onWindowFocus);
      clearInterval(intervalId);
    };
  }, [showLocationPointer, handleUseCurrentLocation]);

  // Lắng nghe thay đổi trạng thái quyền vị trí từ trình duyệt theo thời gian thực qua Permissions API
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) return;
    let permObj: PermissionStatus | null = null;
    let isCancelled = false;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (isCancelled) return;
        permObj = status;
        const handlePermChange = () => {
          if (status.state === 'granted') {
            setIsLocationSwitchOn(true);
            setShowLocationPointer(false);
            handleUseCurrentLocation();
          } else if (status.state === 'denied') {
            setIsLocationSwitchOn(false);
          }
        };
        status.addEventListener('change', handlePermChange);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
      if (permObj) {
        permObj.onchange = null;
      }
    };
  }, [handleUseCurrentLocation]);

  // Xử lý khi người dùng tương tác trực tiếp trên bản đồ (click hoặc kéo marker)
  const handleMapLocationSelect = useCallback(
    async (coords: LocationCoords) => {
      hasUserOverriddenCoords.current = true;
      setSelectedCoords(coords);
      setIsEstimateLocation(false);
      setMapValidationError(null);

      // Tra cứu chi tiết địa chỉ khi click/kéo ghim trên bản đồ
      const details = await reverseGeocodeDetails(coords.lat, coords.lng);
      const fullPlaceName =
        details?.place_name || coords.displayName || `Vị trí (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;

      const resolvedProv =
        findMatchingProvince(details?.components?.province) ||
        findMatchingProvince(fullPlaceName) ||
        getProvinceFromCoords(coords.lat, coords.lng);

      let resolvedWard = details?.components?.ward || parseAddressComponents(fullPlaceName).ward || '';
      let resolvedDist = details?.components?.district || parseAddressComponents(fullPlaceName).district || '';

      if (!resolvedDist && resolvedProv && resolvedWard) {
        resolvedDist = findDistrictByWard(resolvedProv, resolvedWard) || '';
      }

      const currentStreet = form.getFieldValue('streetAddress');
      let finalStreet = currentStreet;
      if (!currentStreet || !currentStreet.trim() || currentStreet.startsWith('Vị trí')) {
        finalStreet =
          details?.components?.streetAddress ||
          (details?.title && !details.title.startsWith('Vị trí') ? details.title : '') ||
          (fullPlaceName && !fullPlaceName.startsWith('Vị trí') ? fullPlaceName.split(',')[0] : '') ||
          `Vị trí (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
      }

      const updateValues: Partial<AddressRequest> = {
        latitude: coords.lat,
        longitude: coords.lng,
        streetAddress: finalStreet,
      };

      if (resolvedProv) {
        prevProvinceRef.current = resolvedProv;
        updateValues.province = resolvedProv;
      }
      if (resolvedDist) {
        updateValues.district = resolvedDist;
      }
      if (resolvedWard) {
        updateValues.ward = resolvedWard;
      }

      form.setFieldsValue(updateValues);
    },
    [form]
  );

  const handleFinish = async (values: AddressRequest) => {
    let lat = selectedCoords?.lat ?? values.latitude;
    let lng = selectedCoords?.lng ?? values.longitude;

    // Nếu vẫn chưa có tọa độ ghim, tự động geocode lần cuối để validate và ghim trước khi lưu
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isValidCoordinate(lat, lng)) {
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

        if (autoGeocode && isValidCoordinate(autoGeocode.lat, autoGeocode.lng)) {
          lat = autoGeocode.lat;
          lng = autoGeocode.lng;
          setSelectedCoords({
            lat: autoGeocode.lat,
            lng: autoGeocode.lng,
            displayName: autoGeocode.displayName,
          });
          const detected = findMatchingProvince(autoGeocode.displayName);
          if (detected && detected !== values.province) {
            values.province = detected;
          }
        }
      } catch {
        // ignore
      }
    }

    // QUY TẮC BẮT BUỘC: Nếu địa chỉ không tồn tại trên bản đồ (không lấy được tọa độ hợp lệ), CHẶN KHÔNG CHO THÊM
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isValidCoordinate(lat, lng)) {
      const errorMsg =
        'Địa chỉ không tồn tại trên bản đồ hoặc không thuộc khu vực đã chọn. Vui lòng kiểm tra lại địa chỉ hoặc chọn vị trí trên bản đồ.';
      setMapValidationError(errorMsg);
      message.error(errorMsg);
      return; // Dừng lại, không thêm được!
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

    setDuplicateError(null);

    // Kiểm tra trùng lặp trên Form UI trước khi gọi onSubmit
    try {
      const addressList = existingAddresses ?? (await userService.getAddresses());
      const isDup = checkDuplicateAddress(submitValues, addressList, initialData?.id);
      if (isDup) {
        const errorMsg = 'Địa chỉ này đã tồn tại trong sổ địa chỉ của bạn.';
        setDuplicateError(errorMsg);
        message.error(errorMsg);
        return;
      }
    } catch {
      // nếu lấy getAddresses thất bại, để onSubmit xử lý tiếp
    }

    try {
      await onSubmit(submitValues);
    } catch (err: any) {
      if (err?.message?.includes('tồn tại') || err?.message?.includes('trùng')) {
        setDuplicateError(err.message);
      }
      throw err;
    }
  };

  return (
    <>
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
        {duplicateError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm font-medium text-red-700"
          >
            <InfoCircleOutlined className="text-red-500" />
            <span>{duplicateError}</span>
          </div>
        )}
        {mapValidationError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm font-medium text-red-700"
          >
            <InfoCircleOutlined className="text-red-500" />
            <span>{mapValidationError}</span>
          </div>
        )}

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
                    return Promise.reject(new Error('Vui lòng chọn hoặc nhập Quận/Huyện'));
                  }
                  if (val && val.trim().length > 0) {
                    if (val.trim().length < 2) {
                      return Promise.reject(new Error('Quận/Huyện tối thiểu 2 ký tự'));
                    }
                    const currentProv = form.getFieldValue('province');
                    const validDistricts = getDistrictsForProvince(currentProv);
                    if (validDistricts.length > 0 && !isDistrictInProvince(val, currentProv)) {
                      return Promise.reject(
                        new Error(`"${val}" không thuộc ${currentProv}. Vui lòng chọn quận/huyện hợp lệ.`)
                      );
                    }
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <AutoComplete
              className="w-full"
              options={districtOptions}
              filterOption={(inputValue, option) =>
                normalizeAdminName(option?.value).includes(normalizeAdminName(inputValue)) ||
                (option?.value ?? '').toLowerCase().includes(inputValue.toLowerCase())
              }
            >
              <Input size="large" placeholder="Quận / Huyện" className="!rounded-xl" />
            </AutoComplete>
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
                    return Promise.reject(new Error('Vui lòng chọn hoặc nhập Phường/Xã'));
                  }
                  if (val && val.trim().length > 0 && val.trim().length < 2) {
                    return Promise.reject(new Error('Phường/Xã tối thiểu 2 ký tự'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <AutoComplete
              className="w-full"
              options={wardOptions}
              filterOption={(inputValue, option) =>
                normalizeAdminName(option?.value).includes(normalizeAdminName(inputValue)) ||
                (option?.value ?? '').toLowerCase().includes(inputValue.toLowerCase())
              }
            >
              <Input size="large" placeholder="Phường / Xã" className="!rounded-xl" />
            </AutoComplete>
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

        {/* Address Label Selector and Current Location Button */}
        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Loại địa chỉ</span>}
          className="!mb-4"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <Form.Item name="label" noStyle initialValue="HOME">
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="HOME" className="!rounded-l-xl">
                  <span className="inline-flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Nhà riêng</span>
                </Radio.Button>
                <Radio.Button value="OFFICE">
                  <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Văn phòng</span>
                </Radio.Button>
                <Radio.Button value="FAMILY">
                  <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Người thân</span>
                </Radio.Button>
                <Radio.Button value="OTHER" className="!rounded-r-xl">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Khác</span>
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            {/* Nút trỏ vị trí hiện tại cạnh mục Khác để người dùng không cần nhập địa chỉ hiện tại */}
            <Button
              type="default"
              icon={<Navigation className="w-3.5 h-3.5 text-blue-600" />}
              onClick={handleUseCurrentLocation}
              loading={isLocatingCurrentGps}
              className="!rounded-xl !border-blue-200 !bg-blue-50/80 !text-blue-700 hover:!bg-blue-100 hover:!border-blue-400 !font-medium !text-xs !h-8 !px-3 shadow-2xs"
            >
              Vị trí hiện tại
            </Button>
          </div>
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
          {mapValidationError ? (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-800 border border-red-200">
              <div className="flex items-center gap-1.5 truncate">
                <InfoCircleOutlined className="text-red-600 shrink-0" />
                <span className="truncate">{mapValidationError}</span>
              </div>
              <Tag color="error" className="!mr-0 shrink-0 font-medium">
                Chưa có trên bản đồ
              </Tag>
            </div>
          ) : selectedCoords ? (
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
                focusProvince={watchedProvince}
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

    {/* Hộp thoại trỏ trực tiếp lên thanh địa chỉ trình duyệt khi chưa bật Location */}
    {showLocationPointer && (
      <div
        role="dialog"
        aria-label="Hướng dẫn bật quyền vị trí"
        className="fixed top-2 left-6 z-[99999] w-88 max-w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-top-4 duration-300"
      >
        {/* Mũi tên động trỏ thẳng lên biểu tượng Cài đặt / Ổ khóa trên thanh địa chỉ */}
        <div className="flex items-center gap-2 mb-2 pl-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl animate-bounce">
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1 text-xs font-bold text-white shadow-lg">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>Nhấp biểu tượng Cài đặt ở ngay phía trên</span>
          </div>
        </div>

        {/* Khung hướng dẫn nổi bật */}
        <div className="rounded-2xl border-2 border-blue-500 bg-white p-4 shadow-2xl ring-4 ring-blue-100">
          <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Cấp quyền truy cập vị trí hiện tại</div>
                <div className="text-[11px] text-gray-500">Trình duyệt đang chặn định vị GPS</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLocationPointer(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Đóng hướng dẫn"
            >
              <CloseOutlined className="text-xs" />
            </button>
          </div>

          {/* Công tắc trực quan trong hộp thoại */}
          <div className="my-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <EnvironmentOutlined className="text-blue-600 text-base" />
                <div>
                  <div className="text-xs font-semibold text-gray-900">Vị trí (Location)</div>
                  <div className="text-[10px] text-gray-500">Bật để tự động điền địa chỉ</div>
                </div>
              </div>
              <Switch
                checked={isLocationSwitchOn}
                loading={isLocatingCurrentGps}
                onChange={handleToggleLocationSwitch}
                className={isLocationSwitchOn ? '!bg-blue-600' : ''}
              />
            </div>
          </div>

          {/* Mô phỏng trực quan bảng cài đặt trình duyệt như hình chụp của Chrome */}
          <div className="my-2.5 rounded-xl border border-gray-700 bg-gray-900 p-3 text-white shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mb-2">
              <span>{typeof window !== 'undefined' ? window.location.host : 'localhost:5173'}</span>
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-blue-300">Biểu tượng góc trái</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-800 p-2.5 border border-gray-700/80">
              <div className="flex items-center gap-2">
                <EnvironmentOutlined className="text-blue-400 text-sm" />
                <span className="text-xs font-semibold text-gray-100">Location (Vị trí)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-300">Gạt BẬT</span>
                <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors">
                  <span className="translate-x-4 pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                </div>
              </div>
            </div>
          </div>

          {/* Trạng thái lắng nghe tự động (Không cần tải lại trang) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-xs text-blue-900 mb-3 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-blue-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>Tự động nhận diện (Không cần tải lại trang):</span>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed pl-3.5">
              Ngay khi bạn gạt bật mục <strong>Location</strong> trên trình duyệt, hệ thống sẽ tự động ghim vị trí và điền địa chỉ ngay lập tức mà không cần F5 hay tải lại trang.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
            <Button
              size="small"
              onClick={() => setShowLocationPointer(false)}
              className="!rounded-lg text-xs"
            >
              Đóng
            </Button>
            <Button
              size="small"
              type="primary"
              loading={isLocatingCurrentGps}
              onClick={() => handleUseCurrentLocation()}
              className="!rounded-lg !bg-blue-600 hover:!bg-blue-700 text-xs font-semibold"
            >
              Thử lại ngay
            </Button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
