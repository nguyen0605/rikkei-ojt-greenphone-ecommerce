import { useEffect, useRef, useState } from 'react';
import { Input } from 'antd';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Search } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateShipping } from '@/store/slices/checkoutSlice';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const schema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  phone: z.string().regex(/^0\d{9}$/, 'SĐT không hợp lệ (10 số, bắt đầu 0)'),
  address: z.string().min(5, 'Địa chỉ tối thiểu 5 ký tự'),
});

type FormData = z.infer<typeof schema>;

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

export default function ShippingForm() {
  const dispatch = useAppDispatch();
  const shipping = useAppSelector((s) => s.checkout.shipping);
  const authUser = useAppSelector((s) => s.auth.user);
  const userEmail = authUser?.email || '';

  useEffect(() => {
    if (userEmail) {
      dispatch(updateShipping({ email: userEmail }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<[number, number] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const {
    register, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: shipping.fullName || '', phone: shipping.phone || '', address: shipping.address || '' },
    mode: 'onChange',
  });

  const watchedAddress = watch('address');

  // Re-seed the form from persisted Redux shipping — RHF defaultValues only apply
  // on first mount, so after REHYDRATE or back-navigation the values would be lost.
  useEffect(() => {
    setValue('fullName', shipping.fullName || '');
    setValue('phone', shipping.phone || '');
    setValue('address', shipping.address || '');
  }, [shipping.fullName, shipping.phone, shipping.address, setValue]);

  // Init map on mount
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [105.85, 21.03], // Vietnam center
      zoom: 6,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [MAPBOX_TOKEN]);

  // Update marker when center changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCenter) return;

    if (markerRef.current) markerRef.current.remove();

    markerRef.current = new mapboxgl.Marker({ color: '#f44' })
      .setLngLat(selectedCenter)
      .addTo(map);

    map.flyTo({ center: selectedCenter, zoom: 15, duration: 1000 });
  }, [selectedCenter]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchAddress = (query: string) => {
    setValue('address', query, { shouldValidate: true });
    dispatch(updateShipping({ address: query }));

    if (!MAPBOX_TOKEN || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=vn&language=vi&access_token=${MAPBOX_TOKEN}&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        const features: MapboxFeature[] = (data.features || []).map((f: { id: string; place_name: string; center: [number, number] }) => ({
          id: f.id, place_name: f.place_name, center: f.center,
        }));
        setSuggestions(features);
        setShowSuggestions(features.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectAddress = (s: MapboxFeature) => {
    setValue('address', s.place_name, { shouldValidate: true });
    dispatch(updateShipping({ address: s.place_name }));
    setSuggestions([]);
    setShowSuggestions(false);
    if (s.center) setSelectedCenter(s.center);
  };

  const handleFieldChange = (field: 'fullName' | 'phone', value: string) => {
    dispatch(updateShipping({ [field]: value }));
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Thông tin giao hàng</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Họ và tên <span className="text-red-500">*</span></label>
          <Input {...register('fullName')} placeholder="Nguyễn Văn A" status={errors.fullName ? 'error' : ''} size="large"
            onChange={(e) => { setValue('fullName', e.target.value, { shouldValidate: true }); handleFieldChange('fullName', e.target.value); }} />
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Số điện thoại <span className="text-red-500">*</span></label>
          <Input {...register('phone')} placeholder="0901234567" status={errors.phone ? 'error' : ''} size="large"
            onChange={(e) => { setValue('phone', e.target.value, { shouldValidate: true }); handleFieldChange('phone', e.target.value); }} />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <Input value={userEmail || 'Chưa có email'} type="email" size="large" disabled className="bg-gray-50 text-gray-600" />
        </div>
      </div>

      {/* Address with MapBox */}
      <div className="mt-6" ref={containerRef}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          <MapPin className="mr-1 inline-block h-4 w-4 text-green-600" />
          Địa chỉ nhận hàng <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Input size="large" placeholder="Nhập địa chỉ để tìm kiếm..." value={watchedAddress}
            onChange={(e) => searchAddress(e.target.value)}
            prefix={<Search className="h-4 w-4 text-gray-400" />}
            status={errors.address ? 'error' : ''} />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
              {suggestions.map((s) => (
                <button key={s.id} type="button" onClick={() => selectAddress(s)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-green-50">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}

        {/* Interactive Map — mapbox-gl */}
        <div ref={mapContainerRef} className="mt-3 h-[300px] w-full overflow-hidden rounded-xl border border-gray-200" />

        {!MAPBOX_TOKEN && (
          <p className="mt-1 text-xs text-amber-600">
            ⚠ Chưa có <code>VITE_MAPBOX_TOKEN</code> trong <code>Frontend/.env</code>.
            Tạo token tại <a href="https://account.mapbox.com/access-tokens" target="_blank" rel="noreferrer" className="underline">mapbox.com</a>
          </p>
        )}
      </div>
    </div>
  );
}
