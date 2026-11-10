import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Locate, AlertCircle } from 'lucide-react';
import { message } from 'antd';

export interface LocationCoords {
  lat: number;
  lng: number;
  displayName?: string;
}

interface CheckoutDeliveryMapProps {
  selectedLocation: LocationCoords | null;
  onLocationSelect: (location: LocationCoords) => void;
  className?: string;
}

// Tọa độ mặc định: Trung tâm TP. Hồ Chí Minh / Hà Nội
const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];
const DEFAULT_ZOOM = 13;
const FOCUSED_ZOOM = 16;

/**
 * Tạo Icon SVG ghim màu xanh lá thương hiệu cho Vị trí nhận hàng (Delivery Pin)
 */
function createCustomDeliveryIcon() {
  return L.divIcon({
    className: 'custom-delivery-pin-marker',
    html: `
      <div style="position: relative; width: 34px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: grab;">
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35)); transition: transform 0.2s;">
          <path d="M17 0C7.61116 0 0 7.61116 0 17C0 29.75 17 44 17 44C17 44 34 29.75 34 17C34 7.61116 26.3888 0 17 0Z" fill="#16a34a"/>
          <circle cx="17" cy="17" r="7" fill="#ffffff"/>
          <circle cx="17" cy="17" r="3.5" fill="#15803d"/>
        </svg>
      </div>
    `,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -44],
  });
}

/**
 * Tạo Icon chấm xanh dương phát sóng (Blue Pulse Dot) cho Vị trí hiện tại của thiết bị
 */
function createDeviceLocationIcon() {
  return L.divIcon({
    className: 'custom-device-pulse-marker',
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.35); animation: pulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

export default function CheckoutDeliveryMap({
  selectedLocation,
  onLocationSelect,
  className = '',
}: CheckoutDeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const deviceMarkerRef = useRef<L.Marker | null>(null);
  const deviceCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasTileError, setHasTileError] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  // Giữ callback mới nhất để tránh stale closures trong event listeners Leaflet
  const onLocationSelectRef = useRef(onLocationSelect);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Khởi tạo bản đồ Leaflet OpenStreetMap
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const initialCenter = selectedLocation
      ? ([selectedLocation.lat, selectedLocation.lng] as [number, number])
      : DEFAULT_CENTER;
    const initialZoom = selectedLocation ? FOCUSED_ZOOM : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
    });

    // Nút điều khiển zoom ở góc trên bên phải
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Layer bản đồ OpenStreetMap mirror .de (tốc độ cao, ổn định tại Việt Nam)
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
      subdomains: ['a', 'b', 'c'],
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      keepBuffer: 4,
    });

    tileLayer.on('load', () => {
      setIsLoading(false);
      setHasTileError(false);
    });

    let failedTileCount = 0;
    // Cơ chế retry tile sang mirror openstreetmap.org nếu tile bị lỗi
    tileLayer.on('tileerror', (e) => {
      failedTileCount += 1;
      const targetTile = e.tile as HTMLImageElement;
      if (targetTile && !targetTile.dataset.fallbackApplied) {
        targetTile.dataset.fallbackApplied = 'true';
        const coords = (e as unknown as { coords?: { z: number; x: number; y: number } }).coords;
        if (coords) {
          targetTile.src = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
          return;
        }
      }

      if (failedTileCount >= 8) {
        setHasTileError(true);
        setIsLoading(false);
      }
    });

    tileLayer.addTo(map);

    // Bắt sự kiện click trên bản đồ để chọn vị trí giao hàng
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onLocationSelectRef.current({ lat, lng });
    });

    mapInstanceRef.current = map;

    // Lắng nghe thay đổi kích thước container bằng ResizeObserver
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    // Kích hoạt invalidateSize theo các mốc thời gian chuyển động giao diện (AntD Modal animation ~300ms)
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      setIsLoading(false);
      map.invalidateSize();
    }, 350);
    const timer3 = setTimeout(() => {
      map.invalidateSize();
    }, 700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      resizeObserver?.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      deliveryMarkerRef.current = null;
      deviceMarkerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cập nhật Delivery Marker khi selectedLocation thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!selectedLocation) {
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.remove();
        deliveryMarkerRef.current = null;
      }
      return;
    }

    const { lat, lng, displayName } = selectedLocation;
    const popupContent = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 140px;">
        <div style="font-weight: 600; color: #15803d; margin-bottom: 2px;">📍 Vị trí nhận hàng</div>
        <div style="color: #4b5563; font-size: 11px;">${displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</div>
        <div style="color: #9ca3af; font-size: 10px; margin-top: 4px;">Kéo ghim hoặc bấm bản đồ để đổi vị trí</div>
      </div>
    `;

    if (!deliveryMarkerRef.current) {
      const customIcon = createCustomDeliveryIcon();
      const marker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup(popupContent);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationSelectRef.current({ lat: pos.lat, lng: pos.lng });
      });

      deliveryMarkerRef.current = marker;
    } else {
      deliveryMarkerRef.current.setLatLng([lat, lng]);
      deliveryMarkerRef.current.setPopupContent(popupContent);
    }

    // Di chuyển tâm camera tới vị trí ghim
    map.flyTo([lat, lng], Math.max(map.getZoom(), FOCUSED_ZOOM), {
      duration: 0.8,
    });
  }, [selectedLocation]);

  // Hành động: Đưa camera về lại điểm ghim giao hàng
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedLocation) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], FOCUSED_ZOOM, { duration: 0.6 });
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.openPopup();
      }
    } else if (deviceCoordsRef.current) {
      map.flyTo([deviceCoordsRef.current.lat, deviceCoordsRef.current.lng], FOCUSED_ZOOM, { duration: 0.6 });
    } else {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.6 });
    }
  }, [selectedLocation]);

  // Hành động: Lấy vị trí GPS hiện tại từ trình duyệt
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      message.warning('Trình duyệt của bạn không hỗ trợ định vị Geolocation.');
      return;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude, accuracy } = pos.coords;
        deviceCoordsRef.current = { lat: latitude, lng: longitude };

        // Tạo hoặc cập nhật Device Marker (Blue Pulse Dot)
        if (!deviceMarkerRef.current) {
          const deviceIcon = createDeviceLocationIcon();
          const marker = L.marker([latitude, longitude], {
            icon: deviceIcon,
            zIndexOffset: 1000,
          }).addTo(map);

          marker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
              <div style="font-weight: 600; color: #1d4ed8;">📱 Vị trí thiết bị của bạn</div>
              <div style="color: #6b7280; font-size: 11px;">Độ chính xác: ±${Math.round(accuracy || 10)}m</div>
            </div>
          `);
          deviceMarkerRef.current = marker;
        } else {
          deviceMarkerRef.current.setLatLng([latitude, longitude]);
        }

        // Di chuyển camera tới vị trí thiết bị
        map.flyTo([latitude, longitude], FOCUSED_ZOOM, { duration: 0.8 });

        // Nếu hiện tại chưa có điểm giao hàng nào, tự động chọn vị trí thiết bị làm điểm giao
        if (!selectedLocation) {
          onLocationSelectRef.current({
            lat: latitude,
            lng: longitude,
            displayName: 'Vị trí hiện tại của thiết bị',
          });
          message.success('Đã đặt vị trí nhận hàng tại vị trí thiết bị của bạn.');
        } else {
          message.info('Đã xác định vị trí thiết bị. Bấm hoặc kéo ghim nếu muốn giao đến đây.');
        }
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          message.warning('Trình duyệt đã từ chối quyền truy cập vị trí. Vui lòng cấp quyền trong cài đặt trình duyệt.');
        } else if (err.code === err.TIMEOUT) {
          message.warning('Hết thời gian chờ định vị GPS. Vui lòng thử lại.');
        } else {
          message.warning('Không thể xác định vị trí thiết bị của bạn.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [selectedLocation]);

  return (
    <div
      className={`relative h-[300px] w-full overflow-hidden rounded-xl border border-gray-200 bg-[#f2efe9] z-0 ${className}`}
      data-testid="checkout-delivery-map-container"
    >
      {/* Loading Skeleton */}
      {isLoading && (
        <div
          data-testid="checkout-map-skeleton"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#f2efe9]/95 backdrop-blur-xs transition-opacity duration-300"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-white px-4 py-2 shadow-sm border border-gray-100">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            <span className="text-xs font-medium text-gray-700">Đang tải bản đồ OpenStreetMap...</span>
          </div>
        </div>
      )}

      {/* Cảnh báo lỗi tải tile */}
      {hasTileError && (
        <div
          data-testid="checkout-map-tile-warning"
          className="absolute top-2 left-2 z-20 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-800 border border-amber-200 shadow-xs pointer-events-none"
        >
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>Mạng tải bản đồ chậm. Bạn vẫn có thể chọn vị trí bình thường.</span>
        </div>
      )}

      {/* Nút thao tác nhanh trên bản đồ */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-white/95 p-1 rounded-lg shadow-sm border border-gray-200 backdrop-blur-xs">
        <button
          type="button"
          onClick={handleRecenter}
          title="Đưa tâm bản đồ về điểm nhận hàng"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-green-700 transition-colors"
        >
          <Compass className="h-3.5 w-3.5 text-green-600" />
          <span className="hidden sm:inline">Về điểm ghim</span>
        </button>

        <span className="h-3 w-px bg-gray-300" />

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locatingUser}
          title="Lấy vị trí hiện tại của thiết bị"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-700 transition-colors disabled:opacity-50"
        >
          <Locate className={`h-3.5 w-3.5 text-blue-600 ${locatingUser ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">{locatingUser ? 'Đang định vị...' : 'Vị trí của tôi'}</span>
        </button>
      </div>

      {/* DOM Node gắn Leaflet Map */}
      <div ref={containerRef} className="h-full w-full" data-testid="checkout-leaflet-map-element" />
    </div>
  );
}
