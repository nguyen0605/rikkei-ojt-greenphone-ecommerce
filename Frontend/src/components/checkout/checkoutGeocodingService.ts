/**
 * Checkout Geocoding & Address Autocomplete Service (OpenStreetMap / Leaflet compatible)
 * Hỗ trợ tìm kiếm, gợi ý địa chỉ tức thời (Google Maps style) và reverse geocoding
 * Không phụ thuộc Mapbox token, tuân thủ chính sách sử dụng, không bị chặn mạng tại VN.
 */

export interface AddressSuggestion {
  id: string;
  place_name: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  source: 'photon' | 'dictionary' | 'nominatim';
  components?: {
    province?: string;
    district?: string;
    ward?: string;
    streetAddress?: string;
  };
}

/**
 * Kiểm tra tính hợp lệ của tọa độ địa lý:
 * - Latitude trong khoảng [-90, 90]
 * - Longitude trong khoảng [-180, 180]
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
interface KnownLocation {
  name: string;
  keywords: string[];
  lat: number;
  lng: number;
  province?: string;
  district?: string;
}

/**
 * Danh mục địa danh, quận/huyện phổ biến tại Việt Nam
 * Cho phép phản hồi tức thời (0ms latency), không phụ thuộc mạng, không lộ PII.
 */
export const KNOWN_VN_LOCATIONS: KnownLocation[] = [
  // Hà Nội
  { name: 'Quận Cầu Giấy, Hà Nội', keywords: ['cau giay', 'cầu giấy', 'cg'], lat: 21.0362, lng: 105.7906, province: 'Hà Nội', district: 'Cầu Giấy' },
  { name: 'Quận Đống Đa, Hà Nội', keywords: ['dong da', 'đống đa'], lat: 21.0181, lng: 105.8299, province: 'Hà Nội', district: 'Đống Đa' },
  { name: 'Quận Ba Đình, Hà Nội', keywords: ['ba dinh', 'ba đình'], lat: 21.0341, lng: 105.8342, province: 'Hà Nội', district: 'Ba Đình' },
  { name: 'Quận Hoàn Kiếm, Hà Nội', keywords: ['hoan kiem', 'hoàn kiếm', 'hk'], lat: 21.0285, lng: 105.8542, province: 'Hà Nội', district: 'Hoàn Kiếm' },
  { name: 'Quận Hai Bà Trưng, Hà Nội', keywords: ['hai ba trung', 'hai bà trưng', 'hbt'], lat: 21.0094, lng: 105.8582, province: 'Hà Nội', district: 'Hai Bà Trưng' },
  { name: 'Quận Thanh Xuân, Hà Nội', keywords: ['thanh xuan', 'thanh xuân'], lat: 20.9937, lng: 105.8117, province: 'Hà Nội', district: 'Thanh Xuân' },
  { name: 'Quận Tây Hồ, Hà Nội', keywords: ['tay ho', 'tây hồ'], lat: 21.0716, lng: 105.8228, province: 'Hà Nội', district: 'Tây Hồ' },
  { name: 'Quận Hoàng Mai, Hà Nội', keywords: ['hoang mai', 'hoàng mai'], lat: 20.9754, lng: 105.8457, province: 'Hà Nội', district: 'Hoàng Mai' },
  { name: 'Quận Long Biên, Hà Nội', keywords: ['long bien', 'long biên'], lat: 21.0365, lng: 105.8906, province: 'Hà Nội', district: 'Long Biên' },
  { name: 'Quận Hà Đông, Hà Nội', keywords: ['ha dong', 'hà đông'], lat: 20.9723, lng: 105.7774, province: 'Hà Nội', district: 'Hà Đông' },
  { name: 'Quận Nam Từ Liêm, Hà Nội', keywords: ['nam tu liem', 'nam từ liêm'], lat: 21.0167, lng: 105.7644, province: 'Hà Nội', district: 'Nam Từ Liêm' },
  { name: 'Quận Bắc Từ Liêm, Hà Nội', keywords: ['bac tu liem', 'bắc từ liêm'], lat: 21.0667, lng: 105.7594, province: 'Hà Nội', district: 'Bắc Từ Liêm' },
  { name: 'Huyện Gia Lâm, Hà Nội', keywords: ['gia lam', 'gia lâm'], lat: 21.0232, lng: 105.9412, province: 'Hà Nội', district: 'Gia Lâm' },
  { name: 'Huyện Đông Anh, Hà Nội', keywords: ['dong anh', 'đông anh'], lat: 21.1394, lng: 105.8486, province: 'Hà Nội', district: 'Đông Anh' },
  { name: 'Huyện Thanh Trì, Hà Nội', keywords: ['thanh tri', 'thanh trì'], lat: 20.9483, lng: 105.8519, province: 'Hà Nội', district: 'Thanh Trì' },

  // TP. Hồ Chí Minh
  { name: 'Quận 1, TP. Hồ Chí Minh', keywords: ['quan 1', 'quận 1', 'q1', 'q.1', 'ben nghe', 'bến nghé'], lat: 10.7769, lng: 106.7009, province: 'TP. Hồ Chí Minh', district: 'Quận 1' },
  { name: 'Quận 3, TP. Hồ Chí Minh', keywords: ['quan 3', 'quận 3', 'q3', 'q.3'], lat: 10.7844, lng: 106.6844, province: 'TP. Hồ Chí Minh', district: 'Quận 3' },
  { name: 'Quận 4, TP. Hồ Chí Minh', keywords: ['quan 4', 'quận 4', 'q4', 'q.4'], lat: 10.7600, lng: 106.7042, province: 'TP. Hồ Chí Minh', district: 'Quận 4' },
  { name: 'Quận 5, TP. Hồ Chí Minh', keywords: ['quan 5', 'quận 5', 'q5', 'q.5'], lat: 10.7554, lng: 106.6667, province: 'TP. Hồ Chí Minh', district: 'Quận 5' },
  { name: 'Quận 6, TP. Hồ Chí Minh', keywords: ['quan 6', 'quận 6', 'q6', 'q.6'], lat: 10.7483, lng: 106.6353, province: 'TP. Hồ Chí Minh', district: 'Quận 6' },
  { name: 'Quận 7, TP. Hồ Chí Minh', keywords: ['quan 7', 'quận 7', 'q7', 'q.7', 'phu my hung', 'phú mỹ hưng'], lat: 10.7340, lng: 106.7218, province: 'TP. Hồ Chí Minh', district: 'Quận 7' },
  { name: 'Quận 8, TP. Hồ Chí Minh', keywords: ['quan 8', 'quận 8', 'q8', 'q.8'], lat: 10.7242, lng: 106.6286, province: 'TP. Hồ Chí Minh', district: 'Quận 8' },
  { name: 'Quận 10, TP. Hồ Chí Minh', keywords: ['quan 10', 'quận 10', 'q10', 'q.10'], lat: 10.7716, lng: 106.6672, province: 'TP. Hồ Chí Minh', district: 'Quận 10' },
  { name: 'Quận 11, TP. Hồ Chí Minh', keywords: ['quan 11', 'quận 11', 'q11', 'q.11'], lat: 10.7631, lng: 106.6508, province: 'TP. Hồ Chí Minh', district: 'Quận 11' },
  { name: 'Quận 12, TP. Hồ Chí Minh', keywords: ['quan 12', 'quận 12', 'q12', 'q.12'], lat: 10.8672, lng: 106.6414, province: 'TP. Hồ Chí Minh', district: 'Quận 12' },
  { name: 'Quận Bình Thạnh, TP. Hồ Chí Minh', keywords: ['binh thanh', 'bình thạnh'], lat: 10.8031, lng: 106.7006, province: 'TP. Hồ Chí Minh', district: 'Bình Thạnh' },
  { name: 'Quận Tân Bình, TP. Hồ Chí Minh', keywords: ['tan binh', 'tân bình'], lat: 10.7992, lng: 106.6531, province: 'TP. Hồ Chí Minh', district: 'Tân Bình' },
  { name: 'Quận Tân Phú, TP. Hồ Chí Minh', keywords: ['tan phu', 'tân phú'], lat: 10.7901, lng: 106.6284, province: 'TP. Hồ Chí Minh', district: 'Tân Phú' },
  { name: 'Quận Phú Nhuận, TP. Hồ Chí Minh', keywords: ['phu nhuan', 'phú nhuận'], lat: 10.7992, lng: 106.6803, province: 'TP. Hồ Chí Minh', district: 'Phú Nhuận' },
  { name: 'Quận Gò Vấp, TP. Hồ Chí Minh', keywords: ['go vap', 'gò vấp'], lat: 10.8388, lng: 106.6653, province: 'TP. Hồ Chí Minh', district: 'Gò Vấp' },
  { name: 'Quận Bình Tân, TP. Hồ Chí Minh', keywords: ['binh tan', 'bình tân'], lat: 10.7654, lng: 106.6039, province: 'TP. Hồ Chí Minh', district: 'Bình Tân' },
  { name: 'TP. Thủ Đức, TP. Hồ Chí Minh', keywords: ['thu duc', 'thủ đức', 'tp thu duc', 'quan 9', 'quận 9', 'quan 2', 'quận 2', 'man thien', 'man thiện'], lat: 10.8494, lng: 106.7537, province: 'TP. Hồ Chí Minh', district: 'Thủ Đức' },
  { name: '97 Man Thiện, Tăng Nhơn Phú, TP. Thủ Đức, TP. Hồ Chí Minh', keywords: ['97 man thien', '97 man thiện', '97'], lat: 10.8477, lng: 106.7857, province: 'TP. Hồ Chí Minh', district: 'Thủ Đức' },

  // Đà Nẵng
  { name: 'Quận Hải Châu, Đà Nẵng', keywords: ['hai chau', 'hải châu'], lat: 16.0544, lng: 108.2208, province: 'Đà Nẵng', district: 'Hải Châu' },
  { name: 'Quận Thanh Khê, Đà Nẵng', keywords: ['thanh khe', 'thanh khê'], lat: 16.0617, lng: 108.1884, province: 'Đà Nẵng', district: 'Thanh Khê' },
  { name: 'Quận Sơn Trà, Đà Nẵng', keywords: ['son tra', 'sơn trà'], lat: 16.0913, lng: 108.2562, province: 'Đà Nẵng', district: 'Sơn Trà' },
  { name: 'Quận Ngũ Hành Sơn, Đà Nẵng', keywords: ['ngu hanh son', 'ngũ hành sơn'], lat: 16.0274, lng: 108.2536, province: 'Đà Nẵng', district: 'Ngũ Hành Sơn' },
  { name: 'Quận Cẩm Lệ, Đà Nẵng', keywords: ['cam le', 'cẩm lệ'], lat: 15.9988, lng: 108.1969, province: 'Đà Nẵng', district: 'Cẩm Lệ' },
  { name: 'Quận Liên Chiểu, Đà Nẵng', keywords: ['lien chieu', 'liên chiểu'], lat: 16.0827, lng: 108.1408, province: 'Đà Nẵng', district: 'Liên Chiểu' },

  // Các tỉnh thành phố lớn khác
  { name: 'Thành phố Hải Phòng', keywords: ['hai phong', 'hải phòng'], lat: 20.8449, lng: 106.6881, province: 'Hải Phòng' },
  { name: 'Thành phố Cần Thơ', keywords: ['can tho', 'cần thơ'], lat: 10.0452, lng: 105.7469, province: 'Cần Thơ' },
  { name: 'Thành phố Biên Hòa, Đồng Nai', keywords: ['bien hoa', 'biên hòa', 'dong nai', 'đồng nai'], lat: 10.9574, lng: 106.8427, province: 'Đồng Nai' },
  { name: 'Thành phố Thủ Dầu Một, Bình Dương', keywords: ['thu dau mot', 'thủ dầu một', 'binh duong', 'bình dương'], lat: 10.9805, lng: 106.6519, province: 'Bình Dương' },
  { name: 'Thành phố Huế, Thừa Thiên Huế', keywords: ['hue', 'huế', 'thua thien hue'], lat: 16.4637, lng: 107.5909, province: 'Thừa Thiên Huế' },
  { name: 'Thành phố Nha Trang, Khánh Hòa', keywords: ['nha trang', 'khanh hoa', 'khánh hòa'], lat: 12.2388, lng: 109.1967, province: 'Khánh Hòa' },
  { name: 'Thành phố Vũng Tàu, Bà Rịa - Vũng Tàu', keywords: ['vung tau', 'vũng tàu'], lat: 10.3460, lng: 107.0843, province: 'Bà Rịa - Vũng Tàu' },
];

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu, chữ thường để tìm kiếm linh hoạt
 */
export function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Cache in-memory kết quả tìm kiếm và reverse geocoding để tránh gọi API lặp lại
 */
const searchMemoryCache = new Map<string, AddressSuggestion[]>();
const reverseMemoryCache = new Map<string, string>();

// Request sequence counter để ngăn race condition
let latestSearchRequestId = 0;

/**
 * Helper gọi fetch có timeout an toàn (mặc định 4000ms) để chống treo giao diện
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<Response> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  let signal = timeoutController.signal;
  if (options.signal) {
    if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
      signal = AbortSignal.any([options.signal, timeoutController.signal]);
    } else {
      const merged = new AbortController();
      const onAbort = () => merged.abort();
      options.signal.addEventListener('abort', onAbort, { once: true });
      timeoutController.signal.addEventListener('abort', onAbort, { once: true });
      signal = merged.signal;
    }
  }

  try {
    return await fetch(url, { ...options, signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tìm kiếm gợi ý từ từ điển nội bộ (offline, tức thời)
 */
export function searchLocalDictionary(query: string, maxResults = 5): AddressSuggestion[] {
  const normalized = normalizeVietnamese(query);
  if (!normalized || normalized.length < 2) return [];

  const matches: AddressSuggestion[] = [];

  for (const item of KNOWN_VN_LOCATIONS) {
    const nameMatch = normalizeVietnamese(item.name).includes(normalized);
    const keywordMatch = item.keywords.some((kw) => {
      const normKw = normalizeVietnamese(kw);
      return normKw.includes(normalized) || normalized.includes(normKw);
    });

    if (nameMatch || keywordMatch) {
      matches.push({
        id: `dict-${item.lat}-${item.lng}`,
        place_name: item.name,
        title: item.name.split(',')[0] || item.name,
        subtitle: item.name.split(',').slice(1).join(',').trim() || 'Việt Nam',
        lat: item.lat,
        lng: item.lng,
        source: 'dictionary',
        components: {
          province: item.province,
          district: item.district,
        },
      });
      if (matches.length >= maxResults) break;
    }
  }

  return matches;
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
  };
}

/**
 * Chuẩn hóa kết quả từ Photon OpenStreetMap API thành AddressSuggestion
 */
function mapPhotonFeatureToSuggestion(f: PhotonFeature): AddressSuggestion | null {
  const props = f.properties;
  const [lng, lat] = f.geometry.coordinates;

  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Lấy các thành phần địa chỉ
  const name = props.name || '';
  const street = props.street || '';
  const houseNumber = props.housenumber || '';
  const locality = props.locality || '';
  const district = props.district || '';
  const city = props.city || props.state || '';
  const country = props.country || 'Việt Nam';

  // Xác định tiêu đề chính (Title)
  let title = '';
  if (houseNumber && street) {
    title = `${houseNumber} ${street}`;
    if (name && name !== title && name !== street) {
      title = `${name} (${title})`;
    }
  } else if (street) {
    title = street;
    if (name && name !== street) {
      title = `${name}, ${street}`;
    }
  } else if (name) {
    title = name;
  } else {
    title = district || city || 'Địa chỉ được chọn';
  }

  // Xác định phụ đề hành chính (Subtitle)
  const subParts = [locality, district, city, country].filter(
    (p, i, arr) => p && arr.indexOf(p) === i && !title.includes(p)
  );
  const subtitle = subParts.join(', ') || 'Việt Nam';

  // Tạo place_name hoàn chỉnh
  const placeNameParts = [title, subtitle].filter(Boolean);
  const place_name = placeNameParts.join(', ');

  return {
    id: `photon-${props.osm_id || `${lat}-${lng}`}`,
    place_name,
    title,
    subtitle,
    lat,
    lng,
    source: 'photon',
    components: {
      province: city || props.state,
      district: district,
      ward: locality,
      streetAddress: houseNumber && street ? `${houseNumber} ${street}` : title,
    },
  };
}

/**
 * Tìm kiếm gợi ý địa chỉ thời gian thực (Address Autocomplete)
 * Kết hợp Photon OpenStreetMap + Từ điển nội bộ
 * Hỗ trợ từ khóa ngắn (ví dụ: '97', 'cau giay', 'man thien')
 */
export async function searchAddressSuggestions(
  query: string,
  signal?: AbortSignal,
  focusCoords?: { lat: number; lng: number }
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `${trimmed.toLowerCase()}__${focusCoords ? `${focusCoords.lat.toFixed(2)},${focusCoords.lng.toFixed(2)}` : 'default'}`;
  if (searchMemoryCache.has(cacheKey)) {
    return searchMemoryCache.get(cacheKey)!;
  }

  const thisRequestId = ++latestSearchRequestId;

  // 1. Quét nhanh từ điển địa phương (0ms)
  const localResults = searchLocalDictionary(trimmed, 4);

  // 2. Gọi Photon OpenStreetMap Autocomplete API (chuyên dụng cho search-as-you-type)
  let photonResults: AddressSuggestion[] = [];
  try {
    // Tọa độ focus mặc định (Hà Nội hoặc TP.HCM tùy focusCoords)
    const lat = focusCoords?.lat ?? 10.7769; // Mặc định TP.HCM / Hà Nội
    const lon = focusCoords?.lng ?? 106.7009;

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed
    )}&lat=${lat}&lon=${lon}&limit=8`;

    const res = await fetchWithTimeout(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    }, 4000);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features)) {
        const mapped = (data.features as PhotonFeature[])
          .map(mapPhotonFeatureToSuggestion)
          .filter((item): item is AddressSuggestion => item !== null);

        // Lọc ưu tiên địa chỉ tại Việt Nam hoặc các nước lân cận nếu có
        photonResults = mapped.filter(
          (m) =>
            m.subtitle.includes('Việt Nam') ||
            m.place_name.includes('Việt Nam') ||
            m.lat >= 8.5 && m.lat <= 23.5 && m.lng >= 102.0 && m.lng <= 110.0
        );
      }
    }
  } catch {
    // Bỏ qua lỗi mạng / abort; fallback sang localResults
  }

  // Kiểm tra race condition: nếu có request mới hơn đã được phát đi, không ghi đè
  if (thisRequestId !== latestSearchRequestId) {
    return [];
  }

  // 3. Kết hợp kết quả: ưu tiên kết quả Photon chi tiết (số nhà, tên đường), bổ sung địa danh từ điển
  const combined: AddressSuggestion[] = [];
  const seenCoords = new Set<string>();

  for (const item of [...photonResults, ...localResults]) {
    const coordKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (!seenCoords.has(coordKey)) {
      seenCoords.add(coordKey);
      combined.push(item);
    }
    if (combined.length >= 6) break;
  }

  // Nếu người dùng nhập thuần số (ví dụ '97'), và không có kết quả phù hợp từ mạng
  // Thêm gợi ý mang tính hướng dẫn tiện lợi
  if (combined.length === 0 && /^\d+$/.test(trimmed)) {
    combined.push({
      id: `prompt-${trimmed}`,
      place_name: `Số ${trimmed}... (tiếp tục nhập tên đường hoặc địa chỉ)`,
      title: `Số ${trimmed}`,
      subtitle: 'Vui lòng nhập thêm tên đường (ví dụ: ' + trimmed + ' Man Thiện)',
      lat: focusCoords?.lat ?? 10.8477,
      lng: focusCoords?.lng ?? 106.7857,
      source: 'dictionary',
    });
  }

  searchMemoryCache.set(cacheKey, combined);
  return combined;
}

/**
 * Reverse geocoding: Lấy tên địa chỉ tương ứng từ tọa độ [lat, lng]
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseMemoryCache.has(cacheKey)) {
    return reverseMemoryCache.get(cacheKey)!;
  }

  // 1. Thử qua Photon Reverse Geocoding
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const res = await fetchWithTimeout(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    }, 4000);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        const suggestion = mapPhotonFeatureToSuggestion(data.features[0]);
        if (suggestion && suggestion.place_name) {
          reverseMemoryCache.set(cacheKey, suggestion.place_name);
          return suggestion.place_name;
        }
      }
    }
  } catch {
    // Không ném lỗi ra ngoài khi mất mạng
  }

  // 2. Fallback: Tìm địa danh gần nhất trong từ điển (nếu trong bán kính < 5km)
  for (const item of KNOWN_VN_LOCATIONS) {
    const dLat = Math.abs(item.lat - lat);
    const dLng = Math.abs(item.lng - lng);
    if (dLat < 0.03 && dLng < 0.03) {
      return item.name;
    }
  }

  return `Vị trí tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

export interface AddressComponents {
  streetAddress?: string;
  ward?: string;
  district?: string;
  province?: string;
}

/**
 * Trích xuất các cụm từ khóa tìm kiếm ứng viên từ địa chỉ thô và các thành phần
 */
function extractGeocodeCandidates(
  address: string,
  components?: AddressComponents
): string[] {
  const candidates: string[] = [];

  if (components) {
    const { streetAddress, ward, district, province } = components;
    // Tách tên đường chính (bỏ các ký hiệu •, -, phân khu, v.v.)
    const cleanStreet = streetAddress
      ? streetAddress.split(/[•\-–|;]/)[0].replace(/\s+/g, ' ').trim()
      : '';

    if (cleanStreet) {
      if (district && province) {
        candidates.push([cleanStreet, district, province].filter(Boolean).join(', '));
      }
      if (district) {
        candidates.push([cleanStreet, district].filter(Boolean).join(', '));
      }
      if (province) {
        candidates.push([cleanStreet, province].filter(Boolean).join(', '));
      }
      candidates.push(cleanStreet);
    }

    if (streetAddress && district && streetAddress !== cleanStreet) {
      candidates.push([streetAddress.replace(/[•|]/g, ' ').replace(/\s+/g, ' ').trim(), district].join(', '));
    }

    if (ward && district) {
      candidates.push([ward, district, province].filter(Boolean).join(', '));
    }

    if (district) {
      candidates.push([district, province].filter(Boolean).join(', '));
    }
  }

  // Phân rã chuỗi địa chỉ thô
  const rawParts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (rawParts.length >= 2) {
    const mainStreet = rawParts[0].split(/[•\-–|;]/)[0].replace(/\s+/g, ' ').trim();
    const city = rawParts[rawParts.length - 1];
    const dist = rawParts.length >= 3 ? rawParts[rawParts.length - 2] : '';
    if (mainStreet) {
      candidates.push([mainStreet, dist, city].filter(Boolean).join(', '));
      candidates.push(mainStreet);
    }
    if (dist) {
      candidates.push([dist, city].filter(Boolean).join(', '));
    }
  }

  candidates.push(address.replace(/[•|]/g, ' ').replace(/\s+/g, ' ').trim());

  // Deduplicate and filter out empty / too short
  return Array.from(new Set(candidates.filter((c) => c && c.length >= 2)));
}

/**
 * Thử định vị tọa độ từ một chuỗi địa chỉ có sẵn và các thành phần cấu trúc
 */
export async function geocodeInitialAddress(
  address: string,
  components?: AddressComponents
): Promise<{
  lat: number;
  lng: number;
  displayName: string;
  components?: AddressSuggestion['components'];
} | null> {
  const trimmed = address.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const candidates = extractGeocodeCandidates(trimmed, components);

  // 1. Thử tìm kiếm chi tiết qua Photon Autocomplete cho từng ứng viên (từ chi tiết đến tổng quát)
  for (const q of candidates) {
    try {
      const suggestions = await searchAddressSuggestions(q);
      const valid = suggestions.find((s) => !s.id.startsWith('prompt-'));
      if (valid) {
        return {
          lat: valid.lat,
          lng: valid.lng,
          displayName: valid.place_name,
          components: valid.components,
        };
      }
    } catch {
      // Tiếp tục ứng viên tiếp theo
    }
  }

  // 2. Fallback: Nếu mạng lỗi hoặc không tìm thấy qua Photon, quét từ điển địa phương
  for (const q of candidates) {
    const localMatches = searchLocalDictionary(q, 1);
    if (localMatches.length > 0) {
      return {
        lat: localMatches[0].lat,
        lng: localMatches[0].lng,
        displayName: localMatches[0].place_name,
        components: localMatches[0].components,
      };
    }
  }

  return null;
}
